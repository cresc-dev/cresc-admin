import { queryClient } from '@/utils/queryClient';
import request from './request';

type BindingRequest = {
  versionId: number;
  packageId: number;
  rollout?: number | null;
  config?: Record<string, any>;
};

type UpsertBindingsParams = { appId: number } & (
  | {
      versionId: number;
      packageIds: number[];
      rollout?: number | null;
      config?: Record<string, any>;
    }
  | {
      bindings: BindingRequest[];
    }
);

export type InternalMetricCounter = {
  labels: Record<string, string>;
  name: string;
  value: number;
};

export type InternalMetricDuration = {
  avgMs: number;
  buckets: Record<string, number>;
  count: number;
  labels: Record<string, string>;
  maxMs: number;
  minMs: number;
  name: string;
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  totalMs: number;
};

export type InternalMetricsBucket = {
  counters: InternalMetricCounter[];
  durations: InternalMetricDuration[];
  end: string;
  start: string;
};

export type InternalMetricsResponse = {
  buckets?: InternalMetricsBucket[];
  config: {
    bucketCount: number;
    bucketMs: number;
    durationBucketsMs: number[];
  };
  counters: InternalMetricCounter[];
  durations: InternalMetricDuration[];
  generatedAt: string;
  process: {
    memory: {
      arrayBuffers: number;
      external: number;
      heapTotal: number;
      heapUsed: number;
      rss: number;
    };
    pid: number;
    uptimeSeconds: number;
  };
};

export type InternalApi5xxEvent = {
  durationMs: number;
  errorCode?: string;
  errorName?: string;
  hostname: string;
  id: number;
  message?: string;
  method: string;
  path: string;
  pid: number;
  requestId?: string;
  statusCode: number;
  time: string;
};

export type InternalApi5xxEventsResponse = {
  capacity: number;
  data: InternalApi5xxEvent[];
  generatedAt: string;
  hasMore: boolean;
  limit: number;
  log?: {
    ignored: number;
    parseErrors: number;
    paths: string[];
    readBytes: number;
  };
  offset: number;
  total: number;
};

export const api = {
  login: (params: { email: string; pwd: string }) =>
    request<{ token?: string }>('post', '/user/login', params, {
      suppressErrorToast: true,
    }),
  logout: () =>
    request('post', '/user/logout', undefined, { suppressErrorToast: true }),
  getOAuthLoginUrl: (provider: 'google' | 'github', loginFrom?: string) =>
    request<{ url: string }>(
      'get',
      `/user/oauth/${provider}/url${
        loginFrom ? `?loginFrom=${encodeURIComponent(loginFrom)}` : ''
      }`,
      undefined,
      {
        suppressErrorToast: true,
      },
    ),
  activate: (params: { token: string }) =>
    request('post', '/user/activate', params),
  me: () => request<User>('get', '/user/me'),
  sendEmail: (params: { email: string }) =>
    request('post', '/user/activate/sendmail', params),
  resetpwdSendMail: (params: { email: string }) =>
    request('post', '/user/resetpwd/sendmail', params),
  register: (params: { [key: string]: string }) =>
    request('post', '/user/register', params, { suppressErrorToast: true }),
  resetPwd: (params: { token: string; newPwd: string }) =>
    request('post', '/user/resetpwd/reset', params),
  // app
  appList: () => request<{ data: App[] }>('get', '/app/list'),
  getApp: (appId: number) => request<App>('get', `/app/${appId}`),
  deleteApp: (appId: number) => request('delete', `/app/${appId}`),
  createApp: (params: { name: string; platform: string }) =>
    request<{ id: number }>('post', '/app/create', params).then((response) => {
      if (!response) throw Error('Failed to create app');
      return response.id;
    }),
  updateApp: (
    appId: number,
    params: Omit<App, 'appKey' | 'checkCount' | 'id' | 'platform'>,
  ) => request('put', `/app/${appId}`, params),
  // package
  getPackages: (appId: number) =>
    request<{ data: Package[]; count: number }>(
      'get',
      `/app/${appId}/package/list?limit=1000`,
    ),
  updatePackage: ({
    appId,
    packageId,
    params,
  }: {
    appId: number;
    packageId: number;
    params: {
      note?: string;
      status?: Package['status'];
      versionId?: number | null;
    };
  }) => request('put', `/app/${appId}/package/${packageId}`, params),
  deletePackage: ({ appId, packageId }: { appId: number; packageId: number }) =>
    request('delete', `/app/${appId}/package/${packageId}`),
  deletePackages: ({
    appId,
    packageIds,
  }: {
    appId: number;
    packageIds: number[];
  }) => request('delete', `/app/${appId}/package`, { packageIds }),
  // version
  getVersions: ({
    appId,
    offset = 0,
    limit = 1000,
  }: {
    appId: number;
    offset?: number;
    limit?: number;
  }) =>
    request<{ data: Version[]; count: number }>(
      'get',
      `/app/${appId}/version/list?offset=${offset}&limit=${limit}`,
    ),
  updateVersion: ({
    versionId,
    appId,
    params,
  }: {
    versionId: number;
    appId: number;
    params: Partial<Omit<Version, 'id' | 'packages'>>;
  }) => request('put', `/app/${appId}/version/${versionId}`, params),
  deleteVersion: ({ appId, versionId }: { appId: number; versionId: number }) =>
    request('delete', `/app/${appId}/version/${versionId}`),
  deleteVersions: ({
    appId,
    versionIds,
  }: {
    appId: number;
    versionIds: number[];
  }) =>
    request<{ count: number }>('delete', `/app/${appId}/version`, {
      versionIds,
    }),
  // binding
  getBinding: (appId: number) =>
    request<{ data: Binding[] }>('get', `/app/${appId}/binding`),
  upsertBinding: ({
    appId,
    versionId,
    packageId,
    rollout,
    config,
  }: {
    appId: number;
    versionId: number;
    packageId: number;
    rollout?: number | null;
    config?: Record<string, any>;
  }) =>
    request('post', `/app/${appId}/binding/`, {
      versionId,
      rollout,
      config,
      packageId,
    }),
  upsertBindings: ({ appId, ...params }: UpsertBindingsParams) =>
    request('post', `/app/${appId}/binding/`, params),
  deleteBinding: ({ appId, bindingId }: { appId: number; bindingId: number }) =>
    request('delete', `/app/${appId}/binding/${bindingId}`),
  // Patch generation status; older servers without this endpoint degrade
  // silently (404 -> no tag)
  getDiffStatus: (appId: number) =>
    request<{ data: BindingDiffStatus[] }>(
      'get',
      `/app/${appId}/binding/diffStatus`,
      undefined,
      { suppressErrorToast: true },
    ),
  // audit logs
  getAuditLogs: ({
    offset = 0,
    limit = 20,
    startDate,
  }: {
    offset?: number;
    limit?: number;
    startDate?: string;
  }) =>
    request<{ data: AuditLog[]; count: number }>(
      'get',
      `/audit/logs?offset=${offset}&limit=${limit}&startDate=${startDate}`,
    ),
  // order
  createOrder: (params: { tier?: string }) =>
    request<{ payUrl: string }>('post', '/orders', params),
  cancelSubscription: () =>
    request<{ message: string }>('post', '/orders/cancel').then((res) => {
      queryClient.invalidateQueries({ queryKey: ['userInfo'] });
      return res;
    }),
  resumeSubscription: () =>
    request<{ message: string }>('post', '/orders/resume').then((res) => {
      queryClient.invalidateQueries({ queryKey: ['userInfo'] });
      return res;
    }),
  // global metrics
  getGlobalMetrics: (params: {
    start: string;
    end: string;
    mode?: 'pv' | 'uv';
  }) =>
    request<{
      dict: string[];
      data: Array<{ time: string; data: Array<[number, number]> }>;
    }>(
      'get',
      `/metrics/global?start=${encodeURIComponent(params.start)}&end=${encodeURIComponent(params.end)}&mode=${params.mode || 'pv'}`,
    ),
  getAppMetrics: (params: { appKey: string; start: string; end: string }) =>
    request<{
      dict: string[];
      data: Array<{ time: string; data: Array<[number, number]> }>;
    }>(
      'get',
      `/metrics/app?appKey=${encodeURIComponent(params.appKey)}&start=${encodeURIComponent(params.start)}&end=${encodeURIComponent(params.end)}`,
    ),
  // Client hot-update lifecycle events (version health); dict entries look like `${type}${versionName}`
  getAppEventsMetrics: (params: {
    appKey: string;
    start: string;
    end: string;
  }) =>
    request<{
      dict: string[];
      data: Array<{ time: string; data: Array<[number, number]> }>;
    }>(
      'get',
      `/metrics/app/events?appKey=${encodeURIComponent(params.appKey)}&start=${encodeURIComponent(params.start)}&end=${encodeURIComponent(params.end)}`,
    ),
  getAppEventsDaily: (params: { appKey: string; start: string; end: string }) =>
    request<{
      rows: Array<{
        date: string;
        hash: string;
        name: string | null;
        type: string;
        count: number;
      }>;
    }>(
      'get',
      `/metrics/app/events/daily?appKey=${encodeURIComponent(params.appKey)}&start=${encodeURIComponent(params.start)}&end=${encodeURIComponent(params.end)}`,
    ),
  getInternalMetrics: (params?: {
    baseUrl?: string;
    suppressErrorToast?: boolean;
  }) =>
    request<InternalMetricsResponse>('get', '/metrics/internal', undefined, {
      baseUrl: params?.baseUrl,
      suppressErrorToast: params?.suppressErrorToast,
    }),
  getInternalApi5xxEvents: (params?: {
    baseUrl?: string;
    limit?: number;
    offset?: number;
    suppressErrorToast?: boolean;
  }) => {
    const query: Record<string, number> = {};
    if (params?.offset !== undefined) {
      query.offset = params.offset;
    }
    if (params?.limit !== undefined) {
      query.limit = params.limit;
    }
    return request<InternalApi5xxEventsResponse>(
      'get',
      '/metrics/internal/5xx-events',
      Object.keys(query).length > 0 ? query : undefined,
      {
        baseUrl: params?.baseUrl,
        suppressErrorToast: params?.suppressErrorToast,
      },
    );
  },
  // members / workspaces
  listMembers: () =>
    request<{ data: AccountMember[] }>('get', '/member/list', undefined, {
      suppressErrorToast: true,
    }),
  inviteMember: (params: {
    email: string;
    role: MemberRole;
    appIds?: number[] | null;
  }) => request<{ id: number }>('post', '/member/invite', params),
  updateMember: (
    id: number,
    params: { role?: MemberRole; appIds?: number[] | null },
  ) => request('put', `/member/${id}`, params),
  removeMember: (id: number) => request('delete', `/member/${id}`),
  listWorkspaces: () =>
    request<{ data: Workspace[] }>('get', '/member/workspaces', undefined, {
      suppressErrorToast: true,
    }),
  acceptInvite: (accountId: number) =>
    request('post', '/member/accept', { accountId }),
  leaveWorkspace: (accountId: number) =>
    request('post', '/member/leave', { accountId }),
  // API Token
  createApiToken: (params: {
    name: string;
    permissions?: { read?: boolean; write?: boolean; delete?: boolean };
    scopes?: string[];
    appIds?: number[];
    expiresAt?: string;
  }) => request<ApiToken>('post', '/api-token/create', params),
  listApiTokens: () => request<{ data: ApiToken[] }>('get', '/api-token/list'),
  revokeApiToken: (tokenId: number) =>
    request<{ message: string }>('delete', `/api-token/${tokenId}`),
};
