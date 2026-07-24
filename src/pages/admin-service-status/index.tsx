import { useQuery } from '@tanstack/react-query';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { CloudRunPanel } from './cloudrun-panel';
import { ServiceStatusPanel } from './status-panel';
import { WorkerStatsPanel } from './worker-stats-panel';

const { Text, Title } = Typography;

export const Component = () => {
  const { t } = useTranslation();
  const metricsQuery = useQuery({
    queryFn: () => api.getInternalMetrics({ suppressErrorToast: true }),
    queryKey: ['internalMetrics'],
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
          <CloudRunPanel />
          <WorkerStatsPanel />
        </ServiceStatusPanel>
      </div>
    </div>
  );
};
