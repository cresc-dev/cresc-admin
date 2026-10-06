import type { ConfigSchemaResult } from '@/pages/admin-config.logic';
import {
  buildErrorLogQuery,
  type ErrorLogFilters,
  type ErrorLogPage,
} from '@/pages/admin-error-logs.logic';
import request, { type RequestOptions } from './request';

export type WriteOperationDimension = 'path' | 'region' | 'client';

export type WriteOperationDay = {
  date: string;
  values: Record<string, number>;
};

// GET /admin/system/storage: information_schema estimates plus the artifact
// bucket summary (Cloud Monitoring for GCS, GetBucketStat for OSS). Each
// section is available on its own.
export type StorageUsageError =
  | 'not_configured'
  | 'access_denied'
  | 'unavailable';

export type StorageUsageTable = {
  name: string;
  rowsEstimate: number;
  dataBytes: number;
  indexBytes: number;
  freeBytes: number;
  totalBytes: number;
};

export type StorageUsageClass = {
  class:
    | 'standard'
    | 'nearline'
    | 'coldline'
    | 'infrequentAccess'
    | 'archive'
    | 'coldArchive'
    | 'deepColdArchive';
  bytes: number;
  realBytes: number;
  objectCount: number;
};

export type StorageUsageSnapshot = {
  generatedAt: string;
  database: {
    available: boolean;
    error?: StorageUsageError;
    schema?: string;
    rowsEstimate: number;
    dataBytes: number;
    indexBytes: number;
    freeBytes: number;
    totalBytes: number;
    tables: StorageUsageTable[];
  };
  oss: {
    available: boolean;
    error?: StorageUsageError;
    provider?: 'gcs' | 'oss';
    bucket?: string;
    storageBytes: number;
    objectCount: number;
    multipartUploadCount: number;
    statUpdatedAt: string | null;
    classes: StorageUsageClass[];
  };
};

// GET /admin/system/redis：共享 Redis 的一次 INFO（每节点缓存 10 秒）加上
// 应答节点自己的连接池与熔断器。Redis 不可用时仍返回 200，available=false。
export type RedisCircuit = {
  group: 'default' | 'cache-read' | 'state-read' | 'write';
  open: boolean;
};

export type RedisStatusSnapshot = {
  generatedAt: string;
  available: boolean;
  error?: 'unavailable';
  latencyMs: number;
  server: {
    version: string;
    mode: string;
    role: string;
    uptimeSeconds: number;
    replicas: number;
  };
  clients: {
    connected: number;
    blocked: number;
    pubsub: number;
    max: number;
    rejected: number;
  };
  memory: {
    usedBytes: number;
    rssBytes: number;
    peakBytes: number;
    /** 0 表示未设置 maxmemory。 */
    maxBytes: number;
    policy: string;
    fragmentationRatio: number;
  };
  stats: {
    opsPerSec: number;
    /** INFO 的 instantaneous_*_kbps，单位实为 KB/s。 */
    inputKbps: number;
    outputKbps: number;
    totalCommands: number;
    keyspaceHits: number;
    keyspaceMisses: number;
    hitRate: number | null;
    expiredKeys: number;
    evictedKeys: number;
    errorReplies: number;
  };
  keyspace: { db: string; keys: number; expires: number; avgTtlMs: number }[];
  errors: { prefix: string; count: number }[];
  node: {
    hostname?: string;
    pool: {
      poolSize: number;
      totalConns: number;
      idleConns: number;
      pendingRequests: number;
      hits: number;
      misses: number;
      timeouts: number;
      waitCount: number;
      staleConns: number;
    };
    circuits: RedisCircuit[];
  };
};

export const adminApi = {
  // admin config
  getConfig: () =>
    request<{ data?: Record<string, string> }>('get', `/admin/config`),
  setConfig: (key: string, value: string, options?: RequestOptions) =>
    request<{ key: string; value: string }>(
      'post',
      '/admin/config',
      { key, value },
      options,
    ),
  // 404 on servers that predate the schema endpoint; the page falls back then
  getConfigSchema: () =>
    request<ConfigSchemaResult>('get', '/admin/config/schema', undefined, {
      suppressErrorToast: true,
    }),
  deleteConfig: (key: string) => request('delete', `/admin/config/${key}`),
  // admin user management
  searchUsers: (params?: {
    search?: string;
    status?: string;
    tier?: string;
    orderBy?: string;
    order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.set('search', params.search);
    if (params?.status) queryParams.set('status', params.status);
    if (params?.tier) queryParams.set('tier', params.tier);
    if (params?.orderBy) queryParams.set('orderBy', params.orderBy);
    if (params?.order) queryParams.set('order', params.order);
    if (params?.limit) queryParams.set('limit', String(params.limit));
    if (params?.offset !== undefined)
      queryParams.set('offset', String(params.offset));
    const query = queryParams.toString();
    return request<{ data: AdminUser[]; count: number }>(
      'get',
      query ? `/admin/users?${query}` : '/admin/users',
    );
  },
  deleteUser: (id: number) =>
    request<{ id: number; email: string; appCount: number; deleted: boolean }>(
      'delete',
      `/admin/users/${id}`,
    ),
  updateUser: (id: number, data: Partial<AdminUser>) =>
    request<AdminUser>('put', `/admin/users/${id}`, data),
  // admin app management
  searchApps: (
    params?:
      | string
      | {
          search?: string;
          platform?: string;
          status?: string;
          userId?: number;
          orderBy?: string;
          order?: 'asc' | 'desc';
          limit?: number;
          offset?: number;
        },
  ) => {
    const normalizedParams =
      typeof params === 'string' ? { search: params } : params;
    const queryParams = new URLSearchParams();
    if (normalizedParams?.search) {
      queryParams.set('search', normalizedParams.search);
    }
    if (normalizedParams?.platform) {
      queryParams.set('platform', normalizedParams.platform);
    }
    if (normalizedParams?.status) {
      queryParams.set('status', normalizedParams.status);
    }
    if (normalizedParams?.userId) {
      queryParams.set('userId', String(normalizedParams.userId));
    }
    if (normalizedParams?.orderBy) {
      queryParams.set('orderBy', normalizedParams.orderBy);
    }
    if (normalizedParams?.order) {
      queryParams.set('order', normalizedParams.order);
    }
    if (normalizedParams?.limit) {
      queryParams.set('limit', String(normalizedParams.limit));
    }
    if (normalizedParams?.offset) {
      queryParams.set('offset', String(normalizedParams.offset));
    }
    const query = queryParams.toString();
    return request<{ data: AdminApp[]; count: number }>(
      'get',
      query ? `/admin/apps?${query}` : '/admin/apps',
    );
  },
  // admin version management
  searchVersions: (params?: { search?: string; appId?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.set('search', params.search);
    if (params?.appId) queryParams.set('appId', String(params.appId));
    const query = queryParams.toString();
    return request<{ data: AdminVersion[] }>(
      'get',
      query ? `/admin/versions?${query}` : '/admin/versions',
    );
  },
  updateVersion: (id: number, data: Partial<AdminVersion>) =>
    request<AdminVersion>('put', `/admin/versions/${id}`, data),
  updateApp: (id: number, data: Partial<AdminApp>) =>
    request<AdminApp>('put', `/admin/apps/${id}`, data),
  getUserDetail: (id: number) =>
    request<{
      user: AdminUser & { createdAt: string; updatedAt: string };
      activity: {
        lastOperationAt: string | null;
        dormantMarkedAt: string | null;
      };
      quotaDetail: {
        limit: Quota;
        todayRemaining: number | null;
        todayUsed: number | null;
        last7Days: {
          counts: number[];
          avg: number;
        } | null;
      };
      apps: Array<
        Omit<AdminApp, 'checkCount'> & {
          checkCount: number | null;
          packagesCount: number;
        }
      >;
    }>('get', `/admin/users/${id}`),
  getAppPackages: (appId: number) =>
    request<{
      data: Array<{
        id: number;
        name: string;
        hash: string;
        status: string;
        buildTime: string | null;
        note: string | null;
        createdAt: string;
        updatedAt: string;
      }>;
    }>('get', `/admin/apps/${appId}/packages`),
  // Cloud Run 运维(仅 GCP 部署形态;非 GCP 后端返回 503,前端据此隐藏面板)
  getCloudRunStatus: (baseUrl?: string) =>
    request<{ data: CloudRunServiceStatus[] }>(
      'get',
      '/admin/system/cloudrun/status',
      undefined,
      { baseUrl, suppressErrorToast: true },
    ),
  getQuotaAlerts: () =>
    request<{
      data: { alerts: QuotaAlert[]; generatedAt: string | null } | null;
    }>('get', '/admin/analytics/quota-alerts', undefined, {
      suppressErrorToast: true,
    }),
  getGrowthStats: (days = 30) =>
    request<{ data: GrowthDay[] }>(
      'get',
      `/admin/analytics/growth?days=${days}`,
      undefined,
      { suppressErrorToast: true },
    ),
  getVersionHealthOverview: (days = 7) =>
    request<{ data: VersionHealthOverviewRow[] }>(
      'get',
      `/admin/analytics/version-health?days=${days}`,
      undefined,
      { suppressErrorToast: true },
    ),
  getAnalyticsOverview: (days = 7) =>
    request<{ data: GlobalAnalyticsDay[] }>(
      'get',
      `/admin/analytics/overview?days=${days}`,
      undefined,
      { suppressErrorToast: true },
    ),
  getWriteOperationAnalytics: (dimension: WriteOperationDimension, days = 30) =>
    request<{ data: WriteOperationDay[] }>(
      'get',
      `/admin/analytics/write-operations?days=${days}&dimension=${dimension}`,
      undefined,
      { suppressErrorToast: true },
    ),
  getErrorLogs: (filters: ErrorLogFilters, pageToken?: string) =>
    request<{ data: ErrorLogPage }>(
      'get',
      `/admin/system/logs/errors?${buildErrorLogQuery(filters, pageToken)}`,
      undefined,
      { suppressErrorToast: true },
    ),
  getStorageUsage: () =>
    request<StorageUsageSnapshot>('get', '/admin/system/storage', undefined, {
      suppressErrorToast: true,
    }),
  getRedisStatus: () =>
    request<RedisStatusSnapshot>('get', '/admin/system/redis', undefined, {
      suppressErrorToast: true,
    }),
  getWorkerTaskStats: (days = 7) =>
    request<{ data: WorkerTaskDaySummary[] }>(
      'get',
      `/admin/system/worker/stats?days=${days}`,
      undefined,
      { suppressErrorToast: true },
    ),
  getCloudRunMetrics: (baseUrl?: string) =>
    request<{ data: CloudRunMetricsSnapshot }>(
      'get',
      '/admin/system/cloudrun/metrics',
      undefined,
      { baseUrl, suppressErrorToast: true },
    ),
  getCloudRunRevisions: (service: string, baseUrl?: string) =>
    request<{ data: CloudRunRevision[] }>(
      'get',
      `/admin/system/cloudrun/revisions/${encodeURIComponent(service)}`,
      undefined,
      { baseUrl, suppressErrorToast: true },
    ),
  getCloudRunImages: (baseUrl?: string) =>
    request<{ data: CloudRunImageTag[] }>(
      'get',
      '/admin/system/cloudrun/images',
      undefined,
      { baseUrl, suppressErrorToast: true },
    ),
  cloudRunRollback: ({
    service,
    revision,
    baseUrl,
  }: {
    service: string;
    revision: string;
    baseUrl?: string;
  }) =>
    request<{ ok: boolean; service: string; revision: string }>(
      'post',
      '/admin/system/cloudrun/rollback',
      { service, revision },
      { baseUrl },
    ),
  cloudRunDeploy: ({ tag, baseUrl }: { tag: string; baseUrl?: string }) =>
    request<{ ok: boolean; tag: string }>(
      'post',
      '/admin/system/cloudrun/deploy',
      { tag },
      { baseUrl },
    ),
  // 批量清理休眠用户(默认 dry-run 预览;dryRun:false 才真删)
  bulkDeleteDormant: (params: {
    minDormantDays: number;
    limit?: number;
    dryRun: boolean;
  }) =>
    request<{
      dryRun: boolean;
      minDormantDays: number;
      limit?: number;
      matched?: number;
      sample?: Array<{
        id: number;
        email: string;
        dormantMarkedAt: string | null;
      }>;
      deleted?: number;
      failed?: number;
      deletedEmails?: string[];
    }>('post', '/admin/users/dormant/bulk-delete', params),
};
