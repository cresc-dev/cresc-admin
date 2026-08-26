import { keepPreviousData, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import LocalizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/services/api';
import { hasSession } from '@/services/request';
import { getWorkspaceAccountId } from '@/services/workspace';
import {
  auditKeys,
  memberKeys,
  metricsKeys,
  versionKeys,
} from '@/utils/query-keys';
import { safeStorage } from '@/utils/storage';

dayjs.extend(LocalizedFormat);
dayjs.extend(relativeTime);

const METRIC_CATEGORY_SEPARATOR = '\u001f';
const BUILD_TIME_METRIC_PREFIX = `packageVersion_buildTime${METRIC_CATEGORY_SEPARATOR}`;
const BUNDLE_HASH_METRIC_PREFIX = `packageVersion_bundleHash${METRIC_CATEGORY_SEPARATOR}`;

const buildPackageMetricValue = ({
  name,
  buildTime,
}: Pick<Package, 'name' | 'buildTime'>) => `${name}_${buildTime || 'unknown'}`;

const isIgnoredTimestamp = (timestamp: string) => {
  const normalizedTimestamp = timestamp.trim();
  if (normalizedTimestamp === 'unknown') {
    return true;
  }

  return normalizedTimestamp !== '' && Number(normalizedTimestamp) === 0;
};

export interface PackageMetricWarnings {
  timestamps: string[];
  hashes: string[];
}

const getPackageMetricWarnings = ({
  dict,
  packages,
}: {
  dict?: string[];
  packages: Package[];
}) => {
  const warnings = new Map<
    number,
    { timestamps: Set<string>; hashes: Set<string> }
  >();

  if (!dict?.length || packages.length === 0) {
    return new Map<number, PackageMetricWarnings>();
  }

  const packageCandidates = packages.map((pkg) => ({
    pkg,
    currentBuildTimeValue: buildPackageMetricValue(pkg),
    currentBundleHashValue: pkg.bundleHash
      ? `${pkg.name}_${pkg.bundleHash}`
      : undefined,
  }));

  const buildTimeExactMap = new Map<string, (typeof packageCandidates)[0]>();
  const bundleHashExactMap = new Map<string, (typeof packageCandidates)[0]>();
  const nameMatchMap = new Map<string, (typeof packageCandidates)[0]>();

  // Sort by name length descending to ensure the longest package name wins in prefix match
  for (const candidate of [...packageCandidates].sort(
    (a, b) => b.pkg.name.length - a.pkg.name.length,
  )) {
    if (!buildTimeExactMap.has(candidate.currentBuildTimeValue)) {
      buildTimeExactMap.set(candidate.currentBuildTimeValue, candidate);
    }
    if (
      candidate.currentBundleHashValue &&
      !bundleHashExactMap.has(candidate.currentBundleHashValue)
    ) {
      bundleHashExactMap.set(candidate.currentBundleHashValue, candidate);
    }
    if (!nameMatchMap.has(candidate.pkg.name)) {
      nameMatchMap.set(candidate.pkg.name, candidate);
    }
  }

  const matchByName = (metricValue: string) => {
    let idx = metricValue.lastIndexOf('_');
    while (idx !== -1) {
      const matched = nameMatchMap.get(metricValue.slice(0, idx));
      if (matched) {
        return matched;
      }
      idx = metricValue.lastIndexOf('_', idx - 1);
    }
    return undefined;
  };

  const addWarning = (
    packageId: number,
    kind: 'timestamps' | 'hashes',
    value: string,
  ) => {
    const current = warnings.get(packageId) ?? {
      timestamps: new Set<string>(),
      hashes: new Set<string>(),
    };
    current[kind].add(value);
    warnings.set(packageId, current);
  };

  for (const entry of dict) {
    const isBuildTimeEntry = entry.startsWith(BUILD_TIME_METRIC_PREFIX);
    const isBundleHashEntry =
      !isBuildTimeEntry && entry.startsWith(BUNDLE_HASH_METRIC_PREFIX);
    if (!isBuildTimeEntry && !isBundleHashEntry) {
      continue;
    }

    const metricValue = entry.slice(
      isBuildTimeEntry
        ? BUILD_TIME_METRIC_PREFIX.length
        : BUNDLE_HASH_METRIC_PREFIX.length,
    );
    if (!metricValue) {
      continue;
    }

    if (isBuildTimeEntry) {
      const matchedPackage =
        buildTimeExactMap.get(metricValue) ?? matchByName(metricValue);
      if (
        !matchedPackage ||
        metricValue === matchedPackage.currentBuildTimeValue
      ) {
        continue;
      }
      // Fingerprint-keyed packages without a recorded buildTime have no
      // baseline timestamp to compare against — identity is the hash, so
      // real timestamps reported by old clients are not warnings
      if (matchedPackage.pkg.bundleHash && !matchedPackage.pkg.buildTime) {
        continue;
      }

      const timestamp = metricValue.startsWith(`${matchedPackage.pkg.name}_`)
        ? metricValue.slice(matchedPackage.pkg.name.length + 1) || 'unknown'
        : metricValue;
      if (isIgnoredTimestamp(timestamp)) {
        continue;
      }
      addWarning(matchedPackage.pkg.id, 'timestamps', timestamp);
    } else {
      const matchedPackage =
        bundleHashExactMap.get(metricValue) ?? matchByName(metricValue);
      // Only packages with a recorded fingerprint have a baseline to compare
      if (
        !matchedPackage?.pkg.bundleHash ||
        metricValue === matchedPackage.currentBundleHashValue
      ) {
        continue;
      }

      const hash = metricValue.startsWith(`${matchedPackage.pkg.name}_`)
        ? metricValue.slice(matchedPackage.pkg.name.length + 1)
        : metricValue;
      if (!hash || hash === 'unknown') {
        continue;
      }
      addWarning(matchedPackage.pkg.id, 'hashes', hash);
    }
  }

  return new Map(
    Array.from(warnings.entries()).map(([packageId, packageWarnings]) => [
      packageId,
      {
        timestamps: Array.from(packageWarnings.timestamps).sort(),
        hashes: Array.from(packageWarnings.hashes).sort(),
      },
    ]),
  );
};

const getCooldownRemainingSeconds = (
  storageKey: string,
  durationMs: number,
) => {
  const storedSentAt = safeStorage.get(storageKey);
  const sentAt = Number(storedSentAt);

  if (!Number.isFinite(sentAt) || sentAt <= 0) {
    return 0;
  }

  const remainingMs = durationMs - (Date.now() - sentAt);
  if (remainingMs <= 0) {
    safeStorage.remove(storageKey);
    return 0;
  }

  return Math.ceil(remainingMs / 1000);
};

export const useLocalStorageCooldown = ({
  storageKey,
  durationMs,
}: {
  storageKey: string;
  durationMs: number;
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    const syncRemainingSeconds = () => {
      setRemainingSeconds(getCooldownRemainingSeconds(storageKey, durationMs));
    };

    syncRemainingSeconds();
    const timer = window.setInterval(syncRemainingSeconds, 1000);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        syncRemainingSeconds();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', handleStorage);
    };
  }, [storageKey, durationMs]);

  const startCooldown = () => {
    safeStorage.set(storageKey, String(Date.now()));
    setRemainingSeconds(Math.ceil(durationMs / 1000));
  };

  return {
    isCoolingDown: remainingSeconds > 0,
    remainingSeconds,
    startCooldown,
  };
};

export const useUserInfo = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['userInfo'],
    queryFn: api.me,
    enabled: () => hasSession(),
  });
  const expireDay = dayjs(data?.tierExpiresAt);
  const displayExpireDay = data?.tierExpiresAt ? expireDay.format('LL') : 'N/A';
  const displayRemainingDays = data?.tierExpiresAt
    ? `${expireDay.diff(dayjs(), 'day')} days remaining`
    : undefined;

  return {
    user: hasSession() ? data : null,
    displayExpireDay,
    displayRemainingDays,
    isLoading,
  };
};

export const useAppList = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['appList'],
    queryFn: api.appList,
  });
  return { apps: data?.data, isLoading };
};

export const useApp = (appId: number) => {
  const { data } = useQuery({
    queryKey: ['app', appId],
    queryFn: () => api.getApp(appId),
  });
  return { app: data };
};

export const usePackages = (appId: number) => {
  const { data, isLoading } = useQuery({
    queryKey: ['packages', appId],
    queryFn: () => api.getPackages(appId),
  });
  const { packageMap, packages } = useMemo(() => {
    const packages = data?.data ?? [];
    const packageMap = new Map();
    for (const p of packages) {
      packageMap.set(p.id, p);
    }
    return { packageMap, packages };
  }, [data?.data]);
  return {
    packages,
    packageMap,
    isLoading,
  };
};

export const useVersions = ({
  appId,
  offset = 0,
  limit = 10,
}: {
  appId: number;
  offset?: number;
  limit?: number;
}) => {
  const { data, isLoading } = useQuery({
    queryKey: versionKeys.page(appId, offset, limit),
    staleTime: 3000,
    placeholderData: keepPreviousData,
    queryFn: () => api.getVersions({ appId, offset, limit }),
  });

  return {
    versions: data?.data ?? [],
    count: data?.count ?? 0,
    isLoading,
  };
};

export const useAllVersions = ({
  appId,
  enabled = true,
}: {
  appId: number;
  enabled?: boolean;
}) => {
  const { data, isLoading } = useQuery({
    queryKey: versionKeys.all(appId),
    staleTime: 3000,
    enabled,
    queryFn: () => api.getVersions({ appId, offset: 0, limit: 1000 }),
  });

  return {
    versions: data?.data ?? [],
    count: data?.count ?? 0,
    isLoading,
  };
};

export const useBinding = (appId: number) => {
  const { data, isLoading } = useQuery({
    queryKey: ['bindings', appId],
    queryFn: () => api.getBinding(appId),
  });
  const bindings = data?.data ?? [];
  return { bindings, isLoading };
};

const DIFF_STATUS_POLL_MS = 4000;

export const useDiffStatus = ({
  appId,
  enabled,
}: {
  appId: number;
  enabled: boolean;
}) => {
  const { data } = useQuery({
    queryKey: ['bindingDiffStatus', appId],
    queryFn: () => api.getDiffStatus(appId),
    enabled,
    // Poll only while some patch is still generating; stops automatically on
    // terminal states (or a 404 from an older server)
    refetchInterval: (query) =>
      query.state.data?.data?.some((item) => item.status === 'pending')
        ? DIFF_STATUS_POLL_MS
        : false,
  });

  const diffStatusByVersion = useMemo(() => {
    const map = new Map<number, VersionDiffSummary>();
    for (const item of data?.data ?? []) {
      const summary = map.get(item.versionId) ?? {
        pending: 0,
        done: 0,
        failed: 0,
        total: 0,
      };
      summary[item.status] += 1;
      summary.total += 1;
      map.set(item.versionId, summary);
    }
    return map;
  }, [data?.data]);

  return { diffStatusByVersion };
};

export const usePackageMetricWarnings = ({
  appId,
  app,
  packages,
}: {
  appId: number;
  app?: App;
  packages: Package[];
}) => {
  const [metricsRange] = useState(() => ({
    start: dayjs().subtract(7, 'day').toISOString(),
    end: dayjs().toISOString(),
  }));

  const { data, isLoading } = useQuery({
    queryKey: metricsKeys.packageWarnings(
      appId,
      app?.appKey,
      metricsRange.start,
      metricsRange.end,
    ),
    queryFn: () =>
      api.getAppMetrics({
        appKey: app?.appKey as string,
        start: metricsRange.start,
        end: metricsRange.end,
      }),
    enabled: !!app?.appKey && packages.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  const packageMetricWarnings = useMemo(() => {
    return getPackageMetricWarnings({
      dict: data?.dict,
      packages,
    });
  }, [data?.dict, packages]);

  return {
    app,
    packageMetricWarnings,
    isLoading,
  };
};

/** Audit logs are retained for 180 days; fetch from that lower bound by default */
export const AUDIT_LOG_RETENTION_DAYS = 180;

/**
 * How many rows to ask the server for at once. The server has its own cap
 * (100 in the Go version); the response decides how many actually arrive and
 * the page compares total with the row count to detect truncation.
 */
export const AUDIT_LOG_FETCH_LIMIT = 1000;

/**
 * Audit logs: the date range is filtered server-side, while keyword / action /
 * status filters the server does not support stay on the client within the
 * fetched window. Hence no server-side pagination here: with it, client-side
 * filters would only apply to the current page and export would only cover
 * one page, which is worse.
 */
export const useAuditLogs = ({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
} = {}) => {
  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: [...auditKeys.all(), startDate ?? null, endDate ?? null],
    staleTime: 3000,
    // Keep the previous list while the date range changes so the filter counts don't flash to 0
    placeholderData: keepPreviousData,
    queryFn: () =>
      api.getAuditLogs({
        offset: 0,
        limit: AUDIT_LOG_FETCH_LIMIT,
        // The default lower bound is computed inside queryFn; in the key it would change every render
        startDate:
          startDate ??
          dayjs().subtract(AUDIT_LOG_RETENTION_DAYS, 'day').toISOString(),
        endDate,
      }),
  });

  const auditLogs = data?.data ?? [];
  const total = data?.total ?? data?.count ?? auditLogs.length;

  return {
    auditLogs,
    /** Server-side total within the date range; may exceed auditLogs.length */
    total,
    isLoading,
    isPlaceholderData,
  };
};

/**
 * 当前工作空间下的操作权限(镜像服务端角色矩阵,仅用于隐藏 UI 入口,
 * 真正的判定在服务端)。未切换工作空间 = owner,全量放行;
 * 工作空间成员按角色收敛:viewer 只读、developer 可发版、admin 可管应用。
 * 成员关系加载完成前默认拒绝,避免只读角色短暂看到写按钮。
 */
export const useWorkspacePermissions = () => {
  const workspaceAccountId = getWorkspaceAccountId();
  const { data } = useQuery({
    queryKey: memberKeys.workspaces(),
    queryFn: api.listWorkspaces,
    enabled: !!workspaceAccountId && hasSession(),
    staleTime: 60_000,
  });
  const role = workspaceAccountId
    ? data?.data?.find(
        (workspace) =>
          workspace.account.id === workspaceAccountId &&
          workspace.status === 'active',
      )?.role
    : undefined;
  const isOwner = !workspaceAccountId;
  return {
    /** owner 本人或工作空间角色;加载中为 undefined */
    role: isOwner ? ('owner' as const) : role,
    /** 发版类写操作:上传/发布/回滚/编辑与删除版本、原生包 */
    canPublish: isOwner || role === 'admin' || role === 'developer',
    /** 应用管理:创建/设置/删除应用 */
    canManageApp: isOwner || role === 'admin',
  };
};
