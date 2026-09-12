// Response shapes of the three per-app insight endpoints (see the server's
// client-telemetry doc). All three share the /metrics/app/geo authorization
// boundary and its days parameter (default 7, capped at 35).

/** Final outcome class of a checkUpdate request (the server's classifyResult). */
export const HIT_OUTCOMES = [
  'uptodate',
  'hdiff',
  'pdiff',
  'full',
  'paused',
  'expired',
  'blocked',
  'unknown_package',
] as const;
export type HitOutcome = (typeof HIT_OUTCOMES)[number];

export interface PackageTraffic {
  packageVersion: string;
  requests: number;
  /** From an HLL; may be 0 (no uuid sent, or past the tracking bound). */
  devices: number;
}

/** One UTC+8 calendar day of traffic; today accumulates live. */
export interface AppTrafficDay {
  date: string;
  /** Sum over hit:*, i.e. every completed request including the refusals. */
  requests: number;
  dau: number;
  hourly: number[];
  hit: Partial<Record<HitOutcome, number>> & Record<string, number>;
  ipVersion: Record<string, number>;
  hosts: Record<string, number>;
  carriers: Record<string, number>;
  packages: PackageTraffic[];
}

export interface AppTrafficResponse {
  days: AppTrafficDay[];
  retentionDays: number;
}

export const CLIENT_EVENT_TYPES = [
  'download_success',
  'download_fail',
  'patch_fail',
  'rollback',
  'mark_success',
] as const;
export type ClientEventType = (typeof CLIENT_EVENT_TYPES)[number];

export interface EventOSCount {
  type: ClientEventType;
  hash: string;
  /** null when the version has been deleted. */
  name: string | null;
  os: string;
  count: number;
}

export interface EventReasonCount {
  type: ClientEventType;
  hash: string;
  name: string | null;
  reason: string;
  count: number;
}

export interface EventCarrierCount {
  type: ClientEventType;
  carrier: string;
  count: number;
}

export interface AppEventBreakdownDay {
  date: string;
  byOS: EventOSCount[];
  byReason: EventReasonCount[];
  byCarrier: EventCarrierCount[];
}

export interface AppEventBreakdownResponse {
  days: AppEventBreakdownDay[];
  retentionDays: number;
}

export interface ServedCounts {
  hdiff: number;
  pdiff: number;
  full: number;
  /** Times a full bundle was served because the diff was not generated yet. */
  fullPending: number;
  exp: number;
}

export interface FunnelEventCounts {
  downloadSuccess: number;
  downloadFail: number;
  patchFail: number;
  markSuccess: number;
  rollback: number;
}

export const LAG_BUCKETS = [
  'lt1h',
  '1h-6h',
  '6h-24h',
  '1d-3d',
  '3d-7d',
  'gt7d',
] as const;
export type LagBucket = (typeof LAG_BUCKETS)[number];

export interface LagBuckets {
  downloadSuccess: Partial<Record<LagBucket, number>> | null;
  markSuccess: Partial<Record<LagBucket, number>> | null;
}

export interface PackageFunnel {
  packageVersion: string;
  served: ServedCounts;
  events: FunnelEventCounts;
}

export interface VersionFunnel {
  hash: string;
  name: string | null;
  served: ServedCounts;
  events: FunnelEventCounts;
  /** Devices that ever activated / downloaded this version (HLL, not per day). */
  adopted: { mark: number; download: number };
  lag: LagBuckets;
  byPackage: PackageFunnel[];
}

export interface VersionFunnelResponse {
  days: number;
  start: string;
  end: string;
  /** Live hourly buckets are read from this UTC day onwards. */
  hourlyFrom: string;
  dauToday: number;
  truncated?: boolean;
  versions: VersionFunnel[];
}
