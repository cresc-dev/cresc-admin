import { Grid, Layout, Tabs } from 'antd';

import { useParams } from 'react-router-dom';
import './manage.css';

import { AppDetailHeader } from '@/components/app-detail-header';
import { AppDrawerLayout, useAppWorkspaceList } from '@/components/app-drawer';
import { useAppSettingsModal } from '@/components/app-settings-modal';
import { rootRouterPath, router } from '@/router';
import { rememberRecentApp } from '@/utils/helper';
import { useApp } from '@/utils/hooks';
import PackageList from './components/package-list';
import VersionTable from './components/version-table';
import { ManageProvider, useManageContext } from './hooks/useManageContext';

const ManageDashBoard = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { packages, unusedPackages, packagesLoading } = useManageContext();
  const packageTabItems = [
    {
      key: 'all',
      label: 'All',
      children: <PackageList dataSource={packages} loading={packagesLoading} />,
    },
    {
      key: 'unused',
      label: 'Unused',
      children: (
        <PackageList dataSource={unusedPackages} loading={packagesLoading} />
      ),
    },
  ];

  if (isMobile) {
    return (
      <Tabs
        defaultActiveKey="versions"
        size="small"
        items={[
          {
            key: 'versions',
            label: 'OTA Versions',
            children: <VersionTable />,
          },
          {
            key: 'packages',
            label: 'Native Packages',
            children: (
              <div className="rounded-lg bg-white px-4 pb-4 pt-1">
                <Tabs
                  defaultActiveKey="all"
                  size="small"
                  items={packageTabItems}
                />
              </div>
            ),
          },
        ]}
      />
    );
  }

  return (
    <Layout>
      <Layout.Sider
        theme="light"
        className="p-4 pt-0 h-full rounded-lg"
        width={240}
        style={{ marginRight: 16, maxWidth: '100%' }}
      >
        <div className="py-4">Native Packages</div>
        <Tabs size="middle" items={packageTabItems} />
      </Layout.Sider>
      <Layout.Content className="!p-0" style={{ minWidth: 0 }}>
        <VersionTable />
      </Layout.Content>
    </Layout>
  );
};

export const Manage = () => {
  const params = useParams<{ id?: string }>();
  const id = Number(params.id!);
  const { app } = useApp(id);
  const { apps: appList, isLoading: isAppListLoading } = useAppWorkspaceList();
  const { contextHolder, openAppSettings } = useAppSettingsModal();
  const realtimeMetricsPath = app?.appKey
    ? `${rootRouterPath.realtimeMetrics}?${new URLSearchParams({
        appKey: app.appKey,
      }).toString()}`
    : undefined;

  const content = (
    <ManageProvider appId={id} app={app}>
      {contextHolder}
      <AppDetailHeader
        activeView="management"
        app={app}
        appNameFallback="Loading app"
        metricsDisabled={!realtimeMetricsPath}
        onMetricsClick={() => {
          if (realtimeMetricsPath) {
            router.navigate(realtimeMetricsPath);
          }
        }}
        onSettingsClick={app ? () => openAppSettings(app) : undefined}
        sectionLabel="Apps"
      />
      <ManageDashBoard />
    </ManageProvider>
  );

  return (
    <AppDrawerLayout
      apps={appList ?? []}
      currentAppId={id}
      isLoading={isAppListLoading}
      onSelect={(selectedApp) => {
        rememberRecentApp(selectedApp.id);
        router.navigate(rootRouterPath.versions(String(selectedApp.id)));
      }}
      onSettings={openAppSettings}
    >
      {content}
    </AppDrawerLayout>
  );
};
export const Component = Manage;
