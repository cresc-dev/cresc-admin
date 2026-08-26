import { useQuery } from '@tanstack/react-query';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { serviceStatusKeys } from '@/utils/query-keys';
import { CloudRunPanel } from './cloudrun-panel';
import { QuotaAlertsPanel } from './quota-alerts-panel';
import { ServiceStatusPanel } from './status-panel';
import { UserAnalyticsPanel } from './user-analytics-panel';
import { VersionHealthOverviewPanel } from './version-health-overview-panel';
import { WorkerStatsPanel } from './worker-stats-panel';

const { Text, Title } = Typography;

export const Component = () => {
  const { t } = useTranslation();
  const metricsQuery = useQuery({
    queryFn: () => api.getInternalMetrics({ suppressErrorToast: true }),
    queryKey: serviceStatusKeys.metrics(),
    refetchInterval: 30_000,
  });

  return (
    <div className="page-section">
      <div className="mb-4">
        <Title level={4} className="m-0!">
          {t('admin_service_status.title')}
        </Title>
        <Text type="secondary">{t('admin_service_status.description')}</Text>
      </div>
      <div className="min-w-0">
        <ServiceStatusPanel
          error={metricsQuery.error}
          isFetching={metricsQuery.isFetching}
          snapshot={metricsQuery.data}
        >
          <UserAnalyticsPanel />
          <VersionHealthOverviewPanel />
          <QuotaAlertsPanel />
          <CloudRunPanel />
          <WorkerStatsPanel />
        </ServiceStatusPanel>
      </div>
    </div>
  );
};
