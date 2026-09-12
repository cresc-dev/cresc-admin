// Pure logic of the analytics page: fold the three endpoints' per-day payloads
// into window totals, rankings and rates. No React and no copy in here, so it
// stays unit-testable.

import {
  type AppEventBreakdownDay,
  type AppTrafficDay,
  type ClientEventType,
  type FunnelEventCounts,
  HIT_OUTCOMES,
  type HitOutcome,
  LAG_BUCKETS,
  type LagBucket,
  type ServedCounts,
  type VersionFunnel,
  type VersionFunnelResponse,
} from './types';

export const INSIGHT_DAY_OPTIONS = [7, 14, 35] as const;
export type InsightDays = (typeof INSIGHT_DAY_OPTIONS)[number];
export const DEFAULT_INSIGHT_DAYS: InsightDays = 7;

export const INSIGHT_VIEWS = [
  'overview',
  'versions',
  'traffic',
  'failures',
] as const;
export type InsightView = (typeof INSIGHT_VIEWS)[number];

export const parseInsightDays = (value: string | null): InsightDays => {
  const parsed = Number(value);
  return INSIGHT_DAY_OPTIONS.includes(parsed as InsightDays)
    ? (parsed as InsightDays)
    : DEFAULT_INSIGHT_DAYS;
};

export const parseInsightView = (value: string | null): InsightView =>
  INSIGHT_VIEWS.includes(value as InsightView)
    ? (value as InsightView)
    : 'overview';

/** The server accumulates per UTC+8 calendar day; today's entry is live. */
export const beijingToday = (now: number = Date.now()): string =>
  new Date(now + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);

export interface RankedItem {
  key: string;
  count: number;
  percent: number;
}

/** Rank a {name → count} map by count desc with shares; ties break by name. */
export const rankCounts = (
  counts: Readonly<Record<string, number>> | undefined,
): RankedItem[] => {
  const entries = Object.entries(counts ?? {}).filter(
    ([, count]) => Number.isFinite(count) && count > 0,
  );
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  return entries
    .sort(([leftKey, leftCount], [rightKey, rightCount]) =>
      rightCount === leftCount
        ? leftKey.localeCompare(rightKey)
        : rightCount - leftCount,
    )
    .map(([key, count]) => ({
      key,
      count,
      percent: total > 0 ? (count / total) * 100 : 0,
    }));
};

const addCounts = (
  target: Record<string, number>,
  source: Readonly<Record<string, number>> | undefined,
) => {
  for (const [key, count] of Object.entries(source ?? {})) {
    if (!Number.isFinite(count) || count <= 0) continue;
    target[key] = (target[key] ?? 0) + count;
  }
};

export interface DailyTrafficPoint {
  date: string;
  requests: number;
  dau: number;
  hit: Record<HitOutcome, number>;
  isToday: boolean;
}

export interface PackageTrafficSummary {
  packageVersion: string;
  requests: number;
  /** Highest single-day distinct device count in the window (HLLs cannot be merged across days). */
  peakDevices: number;
  percent: number;
}

export interface TrafficSummary {
  requests: number;
  today: DailyTrafficPoint | null;
  /** Completed days excluding today, the divisor of the daily average. */
  completedDays: number;
  averageDailyRequests: number;
  peakDau: number;
  averageDau: number;
  hit: Record<HitOutcome, number>;
  /** Share of refusals (blocked + unknown_package) among all requests. */
  refusedPercent: number;
  /** Share of served updates (hdiff + pdiff + full) among all requests. */
  updatePercent: number;
  hourly: number[];
  ipVersion: RankedItem[];
  hosts: RankedItem[];
  carriers: RankedItem[];
  packages: PackageTrafficSummary[];
  /** Ascending by date, for the charts. */
  daily: DailyTrafficPoint[];
}

const emptyHit = (): Record<HitOutcome, number> => ({
  uptodate: 0,
  hdiff: 0,
  pdiff: 0,
  full: 0,
  paused: 0,
  expired: 0,
  blocked: 0,
  unknown_package: 0,
});

const percentOf = (part: number, total: number) =>
  total > 0 ? (part / total) * 100 : 0;

/**
 * The server returns newest first; this folds the window's days into one
 * summary. DAU is HLL-distinct and cannot be summed across days, so only the
 * peak and the daily average are reported; per-package devices likewise use
 * the peak single day.
 */
export const summarizeTraffic = (
  days: readonly AppTrafficDay[] | undefined,
  today: string = beijingToday(),
): TrafficSummary => {
  const hit = emptyHit();
  const hourly = new Array<number>(24).fill(0);
  const ipVersion: Record<string, number> = {};
  const hosts: Record<string, number> = {};
  const carriers: Record<string, number> = {};
  const packages = new Map<string, { requests: number; peakDevices: number }>();
  const daily: DailyTrafficPoint[] = [];
  let requests = 0;
  let dauSum = 0;
  let dauDays = 0;
  let peakDau = 0;
  let completedRequests = 0;
  let completedDays = 0;

  for (const day of days ?? []) {
    const dayHit = emptyHit();
    for (const [outcome, count] of Object.entries(day.hit ?? {})) {
      if (!Number.isFinite(count) || count <= 0) continue;
      if (HIT_OUTCOMES.includes(outcome as HitOutcome)) {
        dayHit[outcome as HitOutcome] += count;
        hit[outcome as HitOutcome] += count;
      }
    }
    const dayRequests = Number.isFinite(day.requests) ? day.requests : 0;
    const isToday = day.date === today;
    requests += dayRequests;
    if (!isToday) {
      completedRequests += dayRequests;
      completedDays += 1;
    }
    if (Number.isFinite(day.dau) && day.dau > 0) {
      dauSum += day.dau;
      dauDays += 1;
      peakDau = Math.max(peakDau, day.dau);
    }
    (day.hourly ?? []).forEach((count, hour) => {
      if (hour < 24 && Number.isFinite(count)) {
        hourly[hour] = (hourly[hour] ?? 0) + count;
      }
    });
    addCounts(ipVersion, day.ipVersion);
    addCounts(hosts, day.hosts);
    addCounts(carriers, day.carriers);
    for (const item of day.packages ?? []) {
      const entry = packages.get(item.packageVersion) ?? {
        requests: 0,
        peakDevices: 0,
      };
      entry.requests += item.requests;
      entry.peakDevices = Math.max(entry.peakDevices, item.devices ?? 0);
      packages.set(item.packageVersion, entry);
    }
    daily.push({
      date: day.date,
      requests: dayRequests,
      dau: day.dau ?? 0,
      hit: dayHit,
      isToday,
    });
  }
  daily.sort((left, right) => left.date.localeCompare(right.date));

  const packageRows = Array.from(packages.entries())
    .map(([packageVersion, entry]) => ({
      packageVersion,
      requests: entry.requests,
      peakDevices: entry.peakDevices,
      percent: percentOf(entry.requests, requests),
    }))
    .sort((left, right) =>
      right.requests === left.requests
        ? left.packageVersion.localeCompare(right.packageVersion)
        : right.requests - left.requests,
    );

  return {
    requests,
    today: daily.find((day) => day.isToday) ?? null,
    completedDays,
    averageDailyRequests:
      completedDays > 0 ? completedRequests / completedDays : 0,
    peakDau,
    averageDau: dauDays > 0 ? dauSum / dauDays : 0,
    hit,
    refusedPercent: percentOf(hit.blocked + hit.unknown_package, requests),
    updatePercent: percentOf(hit.hdiff + hit.pdiff + hit.full, requests),
    hourly,
    ipVersion: rankCounts(ipVersion),
    hosts: rankCounts(hosts),
    carriers: rankCounts(carriers),
    packages: packageRows,
    daily,
  };
};

/** The hit outcomes worth flagging: these two are the direct evidence for
 * "why did no update arrive". */
export const trafficWarnings = (
  hit: Readonly<Record<HitOutcome, number>>,
): Array<'blocked' | 'unknown_package'> => {
  const warnings: Array<'blocked' | 'unknown_package'> = [];
  if (hit.blocked > 0) warnings.push('blocked');
  if (hit.unknown_package > 0) warnings.push('unknown_package');
  return warnings;
};

export const servedTotal = (served: ServedCounts | undefined) =>
  served
    ? served.hdiff +
      served.pdiff +
      served.full +
      served.fullPending +
      served.exp
    : 0;

export type FunnelHealth = 'healthy' | 'warning' | 'critical' | null;

// Same thresholds as the service-status version health overview: a rollback
// rate >=5% is critical and >=1% a warning; fewer than 10 samples is not judged.
const CRITICAL_ROLLBACK = 0.05;
const WARNING_ROLLBACK = 0.01;
const MIN_SAMPLES = 10;

export interface FunnelRates {
  /** downloadSuccess / (downloadSuccess + downloadFail) */
  downloadSuccessRate: number | null;
  /** markSuccess / downloadSuccess; can exceed 1 when the download happened before the window. */
  activationRate: number | null;
  /** rollback / (markSuccess + rollback) */
  rollbackRate: number | null;
  failures: number;
  health: FunnelHealth;
}

export const computeFunnelRates = (events: FunnelEventCounts): FunnelRates => {
  const downloadSamples = events.downloadSuccess + events.downloadFail;
  const startSamples = events.markSuccess + events.rollback;
  const rollbackRate = startSamples > 0 ? events.rollback / startSamples : null;
  let health: FunnelHealth = null;
  if (rollbackRate !== null && startSamples >= MIN_SAMPLES) {
    health =
      rollbackRate >= CRITICAL_ROLLBACK
        ? 'critical'
        : rollbackRate >= WARNING_ROLLBACK
          ? 'warning'
          : 'healthy';
  }
  return {
    downloadSuccessRate:
      downloadSamples > 0 ? events.downloadSuccess / downloadSamples : null,
    activationRate:
      events.downloadSuccess > 0
        ? events.markSuccess / events.downloadSuccess
        : null,
    rollbackRate,
    failures: events.downloadFail + events.patchFail,
    health,
  };
};

export interface FunnelRow extends VersionFunnel, FunnelRates {
  servedTotal: number;
  /** adopted.mark / dauToday; null when dauToday is 0. */
  coverage: number | null;
  /** A null name means the version has been deleted. */
  deleted: boolean;
}

export const buildFunnelRows = (
  response: VersionFunnelResponse | undefined,
): FunnelRow[] =>
  (response?.versions ?? []).map((version) => ({
    ...version,
    ...computeFunnelRates(version.events),
    servedTotal: servedTotal(version.served),
    coverage:
      response && response.dauToday > 0
        ? version.adopted.mark / response.dauToday
        : null,
    deleted: version.name === null,
  }));

export interface LagShare {
  bucket: LagBucket;
  count: number;
  percent: number;
}

/** How long after the release the events arrived: expanded in the fixed
 * bucket order, missing buckets filled with 0. */
export const lagShares = (
  buckets: Partial<Record<LagBucket, number>> | null | undefined,
): { total: number; shares: LagShare[] } => {
  const total = LAG_BUCKETS.reduce(
    (sum, bucket) => sum + (buckets?.[bucket] ?? 0),
    0,
  );
  return {
    total,
    shares: LAG_BUCKETS.map((bucket) => {
      const count = buckets?.[bucket] ?? 0;
      return { bucket, count, percent: percentOf(count, total) };
    }),
  };
};

/** Short form of a bundle hash, for labels outside the funnel table. */
export const shortHash = (hash: string) =>
  hash.length > 12 ? `${hash.slice(0, 12)}…` : hash;

export const FAILURE_EVENT_TYPES: ReadonlySet<ClientEventType> = new Set([
  'download_fail',
  'patch_fail',
  'rollback',
]);

export type EventTypeCounts = Record<ClientEventType, number>;

const emptyEventCounts = (): EventTypeCounts => ({
  download_success: 0,
  download_fail: 0,
  patch_fail: 0,
  rollback: 0,
  mark_success: 0,
});

export interface DimensionRow {
  key: string;
  counts: EventTypeCounts;
  total: number;
  /** (downloadFail + patchFail) / (downloadSuccess + downloadFail + patchFail) */
  failureRate: number | null;
  /** rollback / (markSuccess + rollback) */
  rollbackRate: number | null;
}

const finishDimensionRow = (key: string, counts: EventTypeCounts) => {
  const downloadSamples =
    counts.download_success + counts.download_fail + counts.patch_fail;
  const startSamples = counts.mark_success + counts.rollback;
  return {
    key,
    counts,
    total: Object.values(counts).reduce((sum, count) => sum + count, 0),
    failureRate:
      downloadSamples > 0
        ? (counts.download_fail + counts.patch_fail) / downloadSamples
        : null,
    rollbackRate: startSamples > 0 ? counts.rollback / startSamples : null,
  };
};

export interface ReasonVersion {
  hash: string;
  name: string | null;
  count: number;
}

export interface ReasonRow {
  reason: string;
  count: number;
  percent: number;
  byType: Partial<Record<ClientEventType, number>>;
  versions: ReasonVersion[];
}

export interface BreakdownSummary {
  /** Total failure events (the sum over byReason). */
  failures: number;
  reasons: ReasonRow[];
  os: DimensionRow[];
  carriers: DimensionRow[];
  /** Versions seen in the breakdown: hash → name (null once deleted). */
  versionNames: Map<string, string | null>;
}

/**
 * Each of the three breakdowns is summed on its own. byReason holds failure
 * events only, so the failure total is the denominator of the reason shares;
 * byOS and byCarrier also carry successes, which yields a failure rate per
 * platform and per carrier.
 */
export const summarizeBreakdown = (
  days: readonly AppEventBreakdownDay[] | undefined,
  hashFilter?: string,
): BreakdownSummary => {
  const reasons = new Map<
    string,
    {
      count: number;
      byType: Partial<Record<ClientEventType, number>>;
      versions: Map<string, ReasonVersion>;
    }
  >();
  const os = new Map<string, EventTypeCounts>();
  const carriers = new Map<string, EventTypeCounts>();
  const versionNames = new Map<string, string | null>();
  let failures = 0;

  for (const day of days ?? []) {
    for (const item of day.byReason ?? []) {
      if (hashFilter && item.hash !== hashFilter) continue;
      if (!Number.isFinite(item.count) || item.count <= 0) continue;
      failures += item.count;
      if (!versionNames.has(item.hash) || item.name !== null) {
        versionNames.set(item.hash, item.name);
      }
      const entry = reasons.get(item.reason) ?? {
        count: 0,
        byType: {} as Partial<Record<ClientEventType, number>>,
        versions: new Map<string, ReasonVersion>(),
      };
      entry.count += item.count;
      entry.byType[item.type] = (entry.byType[item.type] ?? 0) + item.count;
      const version = entry.versions.get(item.hash) ?? {
        hash: item.hash,
        name: item.name,
        count: 0,
      };
      version.count += item.count;
      if (item.name !== null) version.name = item.name;
      entry.versions.set(item.hash, version);
      reasons.set(item.reason, entry);
    }
    for (const item of day.byOS ?? []) {
      if (hashFilter && item.hash !== hashFilter) continue;
      if (!Number.isFinite(item.count) || item.count <= 0) continue;
      if (!versionNames.has(item.hash) || item.name !== null) {
        versionNames.set(item.hash, item.name);
      }
      const counts = os.get(item.os) ?? emptyEventCounts();
      if (item.type in counts) counts[item.type] += item.count;
      os.set(item.os, counts);
    }
    // The carrier dimension has no hash, so skip it while filtering by version
    if (hashFilter) continue;
    for (const item of day.byCarrier ?? []) {
      if (!Number.isFinite(item.count) || item.count <= 0) continue;
      const counts = carriers.get(item.carrier) ?? emptyEventCounts();
      if (item.type in counts) counts[item.type] += item.count;
      carriers.set(item.carrier, counts);
    }
  }

  const byCountDesc = <T extends { total: number; key: string }>(
    left: T,
    right: T,
  ) =>
    right.total === left.total
      ? left.key.localeCompare(right.key)
      : right.total - left.total;

  return {
    failures,
    reasons: Array.from(reasons.entries())
      .map(([reason, entry]) => ({
        reason,
        count: entry.count,
        percent: percentOf(entry.count, failures),
        byType: entry.byType,
        versions: Array.from(entry.versions.values()).sort(
          (left, right) => right.count - left.count,
        ),
      }))
      .sort((left, right) =>
        right.count === left.count
          ? left.reason.localeCompare(right.reason)
          : right.count - left.count,
      ),
    os: Array.from(os.entries())
      .map(([key, counts]) => finishDimensionRow(key, counts))
      .sort(byCountDesc),
    carriers: Array.from(carriers.entries())
      .map(([key, counts]) => finishDimensionRow(key, counts))
      .sort(byCountDesc),
    versionNames,
  };
};

/** The closed set of failure reasons; anything else arrives as `other:<prefix>`. */
export const KNOWN_FAILURE_REASONS = [
  'empty',
  'crc_mismatch',
  'patch_apply',
  'no_space',
  'timeout',
  'network',
  'http_4xx',
  'http_5xx',
  'file_io',
  'zip',
  'bundle_mismatch',
] as const;
export type KnownFailureReason = (typeof KNOWN_FAILURE_REASONS)[number];

export const parseFailureReason = (
  reason: string,
):
  | { kind: 'known'; reason: KnownFailureReason }
  | { kind: 'other'; detail: string } =>
  KNOWN_FAILURE_REASONS.includes(reason as KnownFailureReason)
    ? { kind: 'known', reason: reason as KnownFailureReason }
    : {
        kind: 'other',
        detail: reason.startsWith('other:') ? reason.slice(6) : reason,
      };

/** The server writes carrier labels as Chinese literals; the UI translates
 * these and shows any unknown label as-is. */
export const KNOWN_CARRIERS = [
  '电信',
  '联通',
  '移动',
  '广电',
  '教育网',
  '云',
  '其他',
  '其他地区',
  'unknown',
] as const;
export type KnownCarrier = (typeof KNOWN_CARRIERS)[number];

export const isKnownCarrier = (carrier: string): carrier is KnownCarrier =>
  KNOWN_CARRIERS.includes(carrier as KnownCarrier);
