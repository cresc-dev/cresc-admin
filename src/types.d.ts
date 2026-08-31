declare module '*.svg' {
  const content: string;
  export default content;
  export const ReactComponent: import('react').FunctionComponent<
    import('react').SVGProps<SVGSVGElement>
  >;
}

declare module '*.png' {
  const content: string;
  export default content;
}
declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.css';

type Style = Record<string, import('react').CSSProperties>;

type Tier =
  | 'free'
  | 'standard'
  | 'premium'
  | 'pro'
  | 'max'
  | 'ultra'
  | 'custom';

interface Quota {
  base?: Exclude<Tier, 'custom'>;
  title?: string;
  app: number;
  package: number;
  bundle: number;
  bundleSize: string;
  pv: number;
  price?: number;
}

/** GET /status: which build is serving this API. The footer and the uptime
 *  probes read the same endpoint. */
interface ServerStatus {
  version: string;
  commit: string;
  buildTime: string;
  hostname: string;
  startTime: string;
  runtimeVersion: string;
  slot: string;
}

interface User {
  email: string;
  id: number;
  name: string;
  tier: Tier;
  tierExpiresAt?: string;
  checkQuota?: number;
  last7dAvg?: number;
  last7dCounts?: number[];
  quota?: Quota;
  admin?: boolean;
  cancelAtPeriodEnd?: boolean;
  pendingDowngrade?: {
    targetTier: Tier;
    effectiveDate: string;
    createdAt: string;
  };
}

interface AdminUser {
  id: number;
  email: string;
  name: string;
  status: 'normal' | 'unverified' | 'dormant' | null;
  tier: string;
  tierExpiresAt?: string | null;
  quota?: Quota | null;
  createdAt?: string;
}

interface AdminApp {
  id: number;
  userId: number | null;
  platform: 'ios' | 'android' | 'harmony';
  name: string;
  appKey: string;
  appSecret: string;
  checkCount?: number;
  downloadUrl: string | null;
  status: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface AdminVersion {
  id: number;
  appId: number;
  hash: string;
  name: string;
  description: string | null;
  metaInfo: string | null;
  config: any | null;
  deps: string | null;
  commit: string | null;
  createdAt?: string;
}

interface McpToken {
  id: number;
  name: string;
  clientId: string;
  /** Only present in the creation response */
  token?: string;
  tokenSuffix: string;
  scopes: string[];
  appIds?: number[] | null;
  createdBy?: number | null;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  isExpired: boolean;
  isRevoked: boolean;
}

interface ApiToken {
  id: number;
  name: string;
  token?: string; // Only available when creating
  tokenSuffix: string;
  permissions: {
    read?: boolean;
    write?: boolean;
    delete?: boolean;
  };
  scopes?: string[] | null;
  appIds?: number[] | null;
  createdBy?: number | null;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isExpired: boolean;
  isRevoked: boolean;
}

interface App {
  id: number;
  name: string;
  platform: 'android' | 'ios' | 'harmony';
  status?: 'normal' | 'paused' | null;
  checkCount?: number;
  downloadUrl?: string;
  appKey?: string;
}

interface PackageBase {
  id: number;
  name: string;
  note?: string;
  status?: 'normal' | 'paused' | 'expired' | null;
}

interface Package extends PackageBase {
  buildTime?: string;
  /** sha256 of the embedded JS bundle (new-CLI uploads only); shown instead of buildTime when present */
  bundleHash?: string;
  deps?: Record<string, string>;
  commit?: Commit;
  hash: string;
  versions?: Version | Version[] | null;
}

interface Commit {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
  origin?: string;
}

interface Version {
  description?: string;
  hash: string;
  id: number;
  metaInfo?: string;
  name: string;
  packages?: PackageBase[];
  deps?: Record<string, string>;
  commit?: Commit;
}

interface AppDetail extends App {
  appKey: string;
  appSecret: string;
  downloadUrl?: string;
}

interface ContentProps {
  app: App;
}

interface VersionConfig {
  rollout?: {
    [packageVersion: string]: number | null;
  };
}

type BindingType = 'full' | 'exp';

interface Binding {
  id: number;
  type: BindingType;
  // appId: number;
  versionId: number;
  packageId: number;
  rollout: number;
  /**
   * Per-delivery config. forceBoot = the client's native cold-start check
   * activates this version right after download, regardless of the in-app
   * updateStrategy (brick rescue). Native check only; rebinding replaces the
   * binding and clears the mark.
   */
  config?: { forceBoot?: boolean; [key: string]: unknown } | null;
}

type DiffPairStatus = 'pending' | 'done' | 'failed';

interface BindingDiffStatus {
  packageId: number;
  versionId: number;
  status: DiffPairStatus;
}

interface VersionDiffSummary {
  pending: number;
  done: number;
  failed: number;
  total: number;
}

interface AuditLog {
  id: number;
  method: string;
  path: string;
  data?: Record<string, any>;
  statusCode: string;
  ip?: string;
  userAgent?: string;
  apiTokens?: {
    name?: string;
    tokenSuffix: string;
  };
  createdAt: string;
}

type MemberRole = 'admin' | 'developer' | 'viewer';
type MemberStatus = 'pending' | 'active';

interface AccountMember {
  id: number;
  role: MemberRole;
  appIds: number[] | null;
  status: MemberStatus;
  createdAt: string;
  member: { id: number; email: string; name: string };
}

interface Workspace {
  id: number;
  role: MemberRole;
  status: MemberStatus;
  appIds: number[] | null;
  createdAt: string;
  account: { id: number; email: string; name: string };
}

interface CloudRunServiceStatus {
  name: string;
  kind: 'service' | 'job';
  url: string | null;
  image: string | null;
  servingRevision: string | null;
  updateTime: string | null;
  lastModifier: string | null;
  ready: boolean;
  reconciling: boolean;
  cpu: string | null;
  memory: string | null;
  minInstances: number | null;
  maxInstances: number | null;
  traffic: Array<{ revision: string | null; percent: number; latest: boolean }>;
}

interface CloudRunRevision {
  name: string;
  image: string | null;
  createTime: string | null;
  serving: boolean;
  trafficPercent: number;
}

interface CloudRunImageTag {
  tag: string;
  updateTime: string | null;
}

interface CloudRunServiceMetrics {
  activeInstances: number | null;
  idleInstances: number | null;
  requestsPerMinute: number | null;
  errorRate5xx: number | null;
  p95LatencyMs: number | null;
}

interface WorkerStatsDistribution {
  avg: number;
  p50: number;
  p95: number;
  max: number;
}

interface WorkerTaskDaySummary {
  date: string;
  count: number;
  byResult: Record<string, number>;
  byFailure: Record<string, number>;
  durationMs: WorkerStatsDistribution | null;
  patchBytes: WorkerStatsDistribution | null;
  artifactBytes: WorkerStatsDistribution | null;
}

interface GlobalAnalyticsDay {
  date: string;
  dau: number;
  countries: Record<string, number>;
  hit: Record<string, number>;
  os: Record<string, number>;
  sdk: Record<string, number>;
  topApps: Array<{ appKey: string; dau: number }>;
}

interface QuotaAlert {
  userId: number;
  email: string;
  tier: string;
  kind: 'near_limit' | 'usage_drop' | 'usage_spike';
  usage: number;
  quotaPv: number;
  last7Avg: number;
  prev7Avg: number;
}

interface GrowthDay {
  date: string;
  mauGlobal: number;
  newDevicesGlobal: number | null;
  perApp: Record<string, { mau: number; new: number | null }>;
}

interface VersionHealthOverviewRow {
  appKey: string | null;
  appName: string;
  platform: string | null;
  hash: string;
  packageVersion: string;
  counts: Record<string, number>;
  rollbackRate: number | null;
  downloadFailRate: number | null;
  startSamples: number;
}

interface CloudRunMetricsSnapshot {
  windowMinutes: number;
  fetchedAt: string;
  services: Record<string, CloudRunServiceMetrics>;
}
