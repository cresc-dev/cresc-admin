export const versionKeys = {
  byApp: (appId: number) => ['versions', appId] as const,
  page: (appId: number, offset: number, limit: number) =>
    ['versions', appId, 'page', offset, limit] as const,
  all: (appId: number) => ['versions', appId, 'all'] as const,
};

export const appKeys = {
  list: () => ['appList'] as const,
  detail: (appId: number) => ['app', appId] as const,
};

export const packageKeys = {
  byApp: (appId: number) => ['packages', appId] as const,
};

export const bindingKeys = {
  byApp: (appId: number) => ['bindings', appId] as const,
  // 独立根 key：绑定 mutation 会对 byApp 前缀做 setQueriesData，不能让
  // diffStatus 命中同一前缀
  diffStatus: (appId: number) => ['bindingDiffStatus', appId] as const,
};

export const userKeys = {
  info: () => ['userInfo'] as const,
  orderBillingConfig: () => ['orderBillingConfig'] as const,
  orderQuotes: (parts: ReadonlyArray<string | number | undefined>) =>
    ['orderQuotes', ...parts] as const,
  accountQuotaVersions: (appId: number) =>
    ['accountQuotaVersions', appId] as const,
  accountQuotaPackages: (appId: number) =>
    ['accountQuotaPackages', appId] as const,
};

export const serverKeys = {
  status: () => ['serverStatus'] as const,
};

export const auditKeys = {
  all: () => ['auditLogs'] as const,
};

export const apiTokenKeys = {
  all: () => ['apiTokens'] as const,
};

export const mcpTokenKeys = {
  all: () => ['mcpTokens'] as const,
};

export const activateKeys = {
  byToken: (token: string | null) => ['activate', token] as const,
};

export const metricsKeys = {
  global: (startDate: string, endDate: string, mode: 'pv' | 'uv') =>
    ['globalMetrics', startDate, endDate, mode] as const,
  app: (appKey: string | undefined, startDate: string, endDate: string) =>
    ['appMetrics', appKey, startDate, endDate] as const,
  appEvents: (appKey: string | undefined, startDate: string, endDate: string) =>
    ['appEventsMetrics', appKey, startDate, endDate] as const,
  packageWarnings: (
    appId: number,
    appKey: string | undefined,
    startDate: string,
    endDate: string,
  ) => ['packageMetricWarnings', appId, appKey, startDate, endDate] as const,
  customerRegions: (days: number) =>
    ['globalMetrics', 'customerRegions', days] as const,
  writeOperations: (dimension: 'region' | 'client', days: number) =>
    ['globalMetrics', 'writeOperations', dimension, days] as const,
};

export const clientErrorKeys = {
  list: (
    appId: number | undefined,
    start: string,
    end: string,
    offset: number,
    limit: number,
    fatal: boolean | undefined,
  ) =>
    ['clientErrors', appId, 'list', start, end, offset, limit, fatal] as const,
  detail: (appId: number | undefined, issueId: number | undefined) =>
    ['clientErrors', appId, 'detail', issueId] as const,
};

// Service status page: the global overview panels hang under 'global', the
// API node's own queries under 'node' and the Cloud Run panel under
// 'cloudRun', so each group can be invalidated by prefix
export const serviceStatusKeys = {
  all: () => ['serviceStatus'] as const,
  analyticsOverview: (days: number) =>
    ['serviceStatus', 'global', 'analyticsOverview', days] as const,
  growthStats: (days: number) =>
    ['serviceStatus', 'global', 'growthStats', days] as const,
  versionHealthOverview: (days: number) =>
    ['serviceStatus', 'global', 'versionHealthOverview', days] as const,
  quotaAlerts: () => ['serviceStatus', 'global', 'quotaAlerts'] as const,
  workerTaskStats: (days: number) =>
    ['serviceStatus', 'global', 'workerTaskStats', days] as const,
  node: () => ['serviceStatus', 'node'] as const,
  metrics: () => ['serviceStatus', 'node', 'metrics'] as const,
  api5xxEvents: (offset: number) =>
    ['serviceStatus', 'node', 'api5xxEvents', offset] as const,
  cloudRun: () => ['serviceStatus', 'cloudRun'] as const,
  cloudRunStatus: () => ['serviceStatus', 'cloudRun', 'status'] as const,
  cloudRunMetrics: () => ['serviceStatus', 'cloudRun', 'metrics'] as const,
  cloudRunRevisions: (service: string | null) =>
    ['serviceStatus', 'cloudRun', 'revisions', service] as const,
  cloudRunImages: () => ['serviceStatus', 'cloudRun', 'images'] as const,
};

export const emailChangeKeys = {
  all: () => ['emailChange'] as const,
  byToken: (mode: 'confirm' | 'revert', token: string) =>
    ['emailChange', mode, token] as const,
};

export const adminKeys = {
  users: (searchQuery?: string) =>
    searchQuery === undefined
      ? (['adminUsers'] as const)
      : (['adminUsers', searchQuery] as const),
  userDetail: (userId: number | null) => ['adminUserDetail', userId] as const,
  apps: (searchQuery?: string, page?: number, pageSize?: number) =>
    searchQuery === undefined
      ? (['adminApps'] as const)
      : (['adminApps', searchQuery, page, pageSize] as const),
  config: () => ['adminConfig'] as const,
};

export const memberKeys = {
  list: () => ['members'] as const,
  workspaces: () => ['workspaces'] as const,
};

export const endpointKeys = {
  // Carries the custom endpoint so switching endpoints re-resolves the base URL
  apiBase: (customBaseUrl: string | null) =>
    ['apiBase', customBaseUrl] as const,
};
