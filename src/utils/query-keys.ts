export const versionKeys = {
  byApp: (appId: number) => ['versions', appId] as const,
  page: (appId: number, offset: number, limit: number) =>
    ['versions', appId, 'page', offset, limit] as const,
  all: (appId: number) => ['versions', appId, 'all'] as const,
};

export const adminKeys = {
  systemInstances: (target: string) =>
    ['adminSystemInstances', target] as const,
  systemNpm: (target: string) => ['adminSystemNpm', target] as const,
};

export const memberKeys = {
  list: () => ['members'] as const,
  workspaces: () => ['workspaces'] as const,
};
