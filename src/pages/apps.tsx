import {
  AppstoreOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, Card, Empty, Input, Spin, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { showCreateAppModal } from '@/components/create-app-modal';
import PlatformIcon from '@/components/platform-icon';
import { rootRouterPath, router } from '@/router';
import { cn, rememberRecentApp } from '@/utils/helper';
import { useAppList } from '@/utils/hooks';

const { Title } = Typography;

type AppItem = NonNullable<ReturnType<typeof useAppList>['apps']>[number];

const platformLabels: Record<AppItem['platform'], string> = {
  android: 'Android',
  ios: 'iOS',
  harmony: 'HarmonyOS',
};

const formatAppKey = (appKey?: string) => {
  if (!appKey) {
    return 'App Key pending';
  }
  if (appKey.length <= 16) {
    return appKey;
  }
  return `${appKey.slice(0, 8)}...${appKey.slice(-6)}`;
};

export const Component = () => {
  const { apps: appList, isLoading } = useAppList();
  const [query, setQuery] = useState('');
  const apps = appList ?? [];
  const normalizedQuery = query.trim().toLowerCase();

  const filteredApps = useMemo(() => {
    if (!normalizedQuery) {
      return apps;
    }
    return apps.filter((app) =>
      [app.name, app.appKey, app.platform]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery)),
    );
  }, [apps, normalizedQuery]);

  const pausedCount = useMemo(
    () => apps.filter((app) => app.status === 'paused').length,
    [apps],
  );
  const totalChecks = useMemo(
    () =>
      apps.reduce((sum, app) => {
        return sum + (app.checkCount ?? 0);
      }, 0),
    [apps],
  );

  const createApp = () => {
    showCreateAppModal({
      onCreated: (id) => {
        rememberRecentApp(id);
        return router.navigate(rootRouterPath.versions(String(id)));
      },
    });
  };

  return (
    <div className="page-section">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-blue-700 text-xs">
            <AppstoreOutlined />
            App workspace
          </div>
          <Title level={3} className="m-0!">
            Applications
          </Title>
          <div className="mt-1 text-gray-500">
            Choose an app to manage versions, native packages, and rollout
            settings.
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            allowClear
            className="w-full sm:w-72"
            prefix={<SearchOutlined />}
            placeholder="Search app name, App Key, or platform"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={createApp}>
            Create App
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <MetricCard label="Total Apps" value={apps.length.toLocaleString()} />
        <MetricCard label="Paused Apps" value={pausedCount.toLocaleString()} />
        <MetricCard label="Total Checks" value={totalChecks.toLocaleString()} />
      </div>

      <Card className="shadow-sm">
        <Spin spinning={isLoading}>
          {filteredApps.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredApps.map((app) => (
                <AppCard app={app} key={app.id} />
              ))}
            </div>
          ) : (
            <Empty
              className="py-16"
              description={query ? 'No apps match this search' : 'No apps yet'}
            >
              {!query && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={createApp}
                >
                  Create First App
                </Button>
              )}
            </Empty>
          )}
        </Spin>
      </Card>
    </div>
  );
};

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-gray-500 text-xs">{label}</div>
      <div className="mt-1 font-semibold text-2xl text-slate-900 tabular-nums">
        {value}
      </div>
    </div>
  );
}

function AppCard({ app }: { app: AppItem }) {
  const appKeyLabel = formatAppKey(app.appKey);

  return (
    <Link
      className="group block h-full no-underline"
      to={rootRouterPath.versions(String(app.id))}
      onClick={() => rememberRecentApp(app.id)}
    >
      <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
              <PlatformIcon platform={app.platform} className="text-xl!" />
            </span>
            <div className="min-w-0">
              <div className="truncate font-semibold text-slate-900">
                {app.name}
              </div>
              <div className="mt-0.5 text-gray-500 text-xs">
                {platformLabels[app.platform]}
              </div>
            </div>
          </div>
          <Tag
            className="m-0 shrink-0"
            color={app.status === 'paused' ? 'orange' : 'green'}
          >
            {app.status === 'paused' ? 'Paused' : 'Active'}
          </Tag>
        </div>

        <div className="mt-auto space-y-2">
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <div className="text-gray-500 text-xs">App Key</div>
            <div
              className={cn(
                'mt-1 truncate font-mono text-xs',
                app.appKey ? 'text-slate-700' : 'text-gray-400',
              )}
              title={app.appKey}
            >
              {appKeyLabel}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Checks</span>
            <span className="font-medium text-slate-800 tabular-nums">
              {(app.checkCount ?? 0).toLocaleString()}
            </span>
          </div>
          <div className="pt-1 text-blue-600 text-xs opacity-0 transition-opacity group-hover:opacity-100">
            Open app management
          </div>
        </div>
      </div>
    </Link>
  );
}
