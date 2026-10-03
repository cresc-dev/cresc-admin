import { Card, Input, Radio, Segmented } from 'antd';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { AppDetailHeader } from '@/components/app-detail-header';
import { AppDrawerLayout } from '@/components/app-drawer';
import { useAppSettingsModal } from '@/components/app-settings-modal';
import { appViewPath, rootRouterPath, router } from '@/router';
import { patchSearchParams, rememberRecentApp } from '@/utils/helper';
import { useWorkspacePermissions } from '@/utils/hooks';
import { useIsMobile } from '@/utils/responsive';
import { useSelectedAppFromUrl } from '@/utils/selected-app';
import { AudiencePanel } from './app-insights/audience-panel';
import { FailuresPanel } from './app-insights/failures-panel';
import {
  DEFAULT_INSIGHT_DAYS,
  INSIGHT_DAY_OPTIONS,
  INSIGHT_VIEWS,
  type InsightView,
  parseInsightDays,
  parseInsightView,
} from './app-insights/logic';
import { OverviewPanel } from './app-insights/overview-panel';
import { hasRealtimeSeriesEntryParams } from './app-insights/realtime-series-panel';
import { TrafficPanel } from './app-insights/traffic-panel';
import { VersionsPanel } from './app-insights/versions-panel';

// The analytics page: overview → version funnel → traffic → failures, with the
// view and the day range kept in the URL. App selection still goes through
// ?appKey (admins may type any App Key).

const VIEW_LABEL_KEY: Record<InsightView, string> = {
  overview: 'app_insights.view_overview',
  versions: 'app_insights.view_versions',
  traffic: 'app_insights.view_traffic',
  audience: 'app_insights.view_audience',
  failures: 'app_insights.view_failures',
};

export const Component = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { contextHolder, openAppSettings } = useAppSettingsModal();
  const { canManageApp } = useWorkspacePermissions();
  const isMobile = useIsMobile();
  const {
    selectableApps,
    isAdmin,
    isLoadingApps,
    selectedAppKey,
    selectedApp,
    selectApp,
  } = useSelectedAppFromUrl();

  // The native-package warning links carry range / focus but no view, so they
  // land straight on the traffic view that holds the live series.
  const view: InsightView = searchParams.has('view')
    ? parseInsightView(searchParams.get('view'))
    : hasRealtimeSeriesEntryParams(searchParams)
      ? 'traffic'
      : 'overview';
  const days = parseInsightDays(searchParams.get('days'));

  const setView = (next: InsightView) =>
    patchSearchParams(setSearchParams, {
      view: next === 'overview' ? undefined : next,
    });

  return (
    <AppDrawerLayout
      apps={selectableApps}
      currentAppKey={selectedAppKey}
      isLoading={isLoadingApps}
      onSelect={selectApp}
      onSettings={canManageApp ? openAppSettings : undefined}
    >
      {contextHolder}
      <AppDetailHeader
        activeView="metrics"
        app={selectedApp}
        appNameFallback={selectedAppKey || t('realtime_metrics.select_app')}
        managementDisabled={!selectedApp}
        onManagementClick={() => {
          if (!selectedApp) {
            return;
          }
          rememberRecentApp(selectedApp.id);
          router.navigate(rootRouterPath.versions(String(selectedApp.id)));
        }}
        onHealthClick={() => {
          router.navigate(
            appViewPath(rootRouterPath.versionHealth, selectedAppKey),
          );
        }}
        onSettingsClick={
          selectedApp && canManageApp
            ? () => openAppSettings(selectedApp)
            : undefined
        }
        sectionLabel={t('realtime_metrics.title')}
      />
      <Card className="insights-page">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
          {/* Five views can outgrow a phone screen: scroll sideways, never the page */}
          <div className="insights-view-switch max-w-full overflow-x-auto">
            <Segmented
              value={view}
              onChange={(value) => setView(value as InsightView)}
              options={INSIGHT_VIEWS.map((value) => ({
                value,
                label: t(VIEW_LABEL_KEY[value]),
              }))}
            />
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
            {isAdmin && (
              <Input.Search
                className="w-full sm:w-56"
                placeholder={t('realtime_metrics.admin_placeholder')}
                allowClear
                onSearch={(value) => {
                  const appKey = value.trim();
                  if (appKey) {
                    patchSearchParams(setSearchParams, { appKey });
                  }
                }}
              />
            )}
            {/* The traffic view's live series and hourly split have their own ranges */}
            {view !== 'traffic' && (
              <Radio.Group
                value={days}
                onChange={(event) =>
                  patchSearchParams(setSearchParams, {
                    days:
                      event.target.value === DEFAULT_INSIGHT_DAYS
                        ? undefined
                        : String(event.target.value),
                  })
                }
                optionType="button"
                buttonStyle="solid"
                block={isMobile}
                className="w-full md:w-auto"
              >
                {INSIGHT_DAY_OPTIONS.map((value) => (
                  <Radio.Button key={value} value={value}>
                    {t('app_insights.days_option', { days: value })}
                  </Radio.Button>
                ))}
              </Radio.Group>
            )}
          </div>
        </div>

        {!selectedAppKey ? (
          <div className="flex h-40 items-center justify-center text-gray-400">
            {t('realtime_metrics.please_select_app')}
          </div>
        ) : view === 'overview' ? (
          <OverviewPanel
            appKey={selectedAppKey}
            days={days}
            onNavigate={setView}
          />
        ) : view === 'versions' ? (
          <VersionsPanel
            appKey={selectedAppKey}
            days={days}
            isAdmin={isAdmin}
          />
        ) : view === 'traffic' ? (
          <TrafficPanel appKey={selectedAppKey} isAdmin={isAdmin} />
        ) : view === 'audience' ? (
          <AudiencePanel
            appKey={selectedAppKey}
            days={days}
            isAdmin={isAdmin}
          />
        ) : (
          <FailuresPanel appKey={selectedAppKey} days={days} />
        )}
      </Card>
    </AppDrawerLayout>
  );
};
