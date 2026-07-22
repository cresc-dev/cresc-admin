import request from './request';

export const adminApi = {
  // admin config
  getConfig: () =>
    request<{ data?: Record<string, string> }>('get', `/admin/config`),
  setConfig: (key: string, value: string) =>
    request<{ key: string; value: string }>('post', '/admin/config', {
      key,
      value,
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
    params?: string | { search?: string; limit?: number; offset?: number },
  ) => {
    const normalizedParams =
      typeof params === 'string' ? { search: params } : params;
    const queryParams = new URLSearchParams();
    if (normalizedParams?.search) {
      queryParams.set('search', normalizedParams.search);
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
        todayRemaining: number;
        todayUsed: number;
        last7Days: {
          counts: number[];
          avg: number;
        };
      };
      apps: Array<
        AdminApp & {
          checkCount: number;
          packagesCount: number;
          packages: Array<{
            id: number;
            name: string;
            hash: string;
            status: string;
            buildTime: string | null;
            buildNumber: string | null;
            note: string | null;
            createdAt: string;
            updatedAt: string;
          }>;
        }
      >;
    }>('get', `/admin/users/${id}`),
  // admin system deploy
  getSystemInstances: (baseUrl?: string) =>
    request<{
      data: SystemInstance[];
      deployStatuses: Record<string, SystemDeployStatus>;
    }>('get', '/admin/system/instances', undefined, {
      baseUrl,
      suppressErrorToast: true,
    }),
  getSystemNpmInfo: (baseUrl?: string) =>
    request<SystemNpmInfo>('get', '/admin/system/npm', undefined, {
      baseUrl,
      suppressErrorToast: true,
    }),
  restartInstance: ({
    instanceId,
    baseUrl,
  }: {
    instanceId: string;
    baseUrl?: string;
  }) =>
    request<{ queued: boolean }>(
      'post',
      `/admin/system/instances/${encodeURIComponent(instanceId)}/command`,
      { action: 'restart' },
      { baseUrl },
    ),
  // Update/rollback is node-level: one global install, then all local
  // processes restart in turn
  updateNode: ({ version, baseUrl }: { version: string; baseUrl?: string }) =>
    request<{ queued: boolean }>(
      'post',
      '/admin/system/update',
      { version },
      { baseUrl },
    ),
  // Cloud Run 运维(仅 GCP 部署形态;非 GCP 后端返回 503,前端据此隐藏面板)
  getCloudRunStatus: (baseUrl?: string) =>
    request<{ data: CloudRunServiceStatus[] }>(
      'get',
      '/admin/system/cloudrun/status',
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
