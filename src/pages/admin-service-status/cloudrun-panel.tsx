import {
  CloudServerOutlined,
  RollbackOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  Descriptions,
  Modal,
  message,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/services/admin-api';

const { Text } = Typography;

const formatMetricCount = (value: number | null) =>
  value === null
    ? '-'
    : value >= 100
      ? Math.round(value).toString()
      : value.toFixed(1);

// Cloud Monitoring 实时指标行(约 3 分钟采集延迟,10 分钟窗口)
const MetricsRow = ({
  metrics,
  t,
}: {
  metrics: CloudRunServiceMetrics;
  t: (key: string) => string;
}) => (
  <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
    <Text type="secondary">
      {t('cloudrun.metrics_instances')}:{' '}
      <Text strong>{metrics.activeInstances ?? 0}</Text>
      {' / '}
      {(metrics.activeInstances ?? 0) + (metrics.idleInstances ?? 0)}
    </Text>
    <Text type="secondary">
      {t('cloudrun.metrics_rpm')}:{' '}
      <Text strong>{formatMetricCount(metrics.requestsPerMinute)}</Text>
    </Text>
    <Text type="secondary">
      {t('cloudrun.metrics_5xx')}:{' '}
      <Text strong type={metrics.errorRate5xx ? 'danger' : undefined}>
        {metrics.errorRate5xx === null
          ? '-'
          : `${(metrics.errorRate5xx * 100).toFixed(1)}%`}
      </Text>
    </Text>
    <Text type="secondary">
      p95:{' '}
      <Text strong>
        {metrics.p95LatencyMs === null
          ? '-'
          : `${Math.round(metrics.p95LatencyMs)}ms`}
      </Text>
    </Text>
  </div>
);

// 服务状态卡片:筛选过的关键参数(版本/资源/扩缩容/流量/就绪)
const StatusCard = ({
  svc,
  metrics,
  onRollback,
  t,
}: {
  svc: CloudRunServiceStatus;
  metrics?: CloudRunServiceMetrics;
  onRollback: (service: string) => void;
  t: (key: string) => string;
}) => (
  <Card size="small" className="h-full">
    <div className="mb-2 flex items-center justify-between">
      <Space>
        <CloudServerOutlined />
        <Text strong>{svc.name}</Text>
        <Tag>{svc.kind === 'job' ? 'Job' : 'Service'}</Tag>
      </Space>
      <Badge
        status={
          svc.reconciling ? 'processing' : svc.ready ? 'success' : 'error'
        }
        text={
          svc.reconciling
            ? t('cloudrun.reconciling')
            : svc.ready
              ? t('cloudrun.ready')
              : t('cloudrun.not_ready')
        }
      />
    </div>
    {svc.kind === 'service' && metrics && (
      <MetricsRow metrics={metrics} t={t} />
    )}
    <Descriptions column={1} size="small" bordered>
      <Descriptions.Item label={t('cloudrun.image')}>
        <code>{svc.image ?? '-'}</code>
      </Descriptions.Item>
      <Descriptions.Item label={t('cloudrun.revision')}>
        {svc.servingRevision ?? '-'}
      </Descriptions.Item>
      <Descriptions.Item label={t('cloudrun.resources')}>
        {svc.cpu ? `${svc.cpu} vCPU / ${svc.memory}` : '-'}
      </Descriptions.Item>
      {svc.kind === 'service' && (
        <Descriptions.Item label={t('cloudrun.scaling')}>
          {svc.minInstances ?? '-'} ~ {svc.maxInstances ?? '-'}
        </Descriptions.Item>
      )}
      {svc.kind === 'service' && svc.traffic.length > 0 && (
        <Descriptions.Item label={t('cloudrun.traffic')}>
          {svc.traffic.map((tr) => (
            <Tag key={`${tr.revision}-${tr.percent}`} color="blue">
              {tr.revision ?? (tr.latest ? 'LATEST' : '?')}: {tr.percent}%
            </Tag>
          ))}
        </Descriptions.Item>
      )}
      <Descriptions.Item label={t('cloudrun.updated')}>
        {svc.updateTime
          ? dayjs(svc.updateTime).format('YYYY-MM-DD HH:mm')
          : '-'}
      </Descriptions.Item>
    </Descriptions>
    {svc.kind === 'service' && (
      <div className="mt-3 text-right">
        <Button
          size="small"
          icon={<RollbackOutlined />}
          onClick={() => onRollback(svc.name)}
        >
          {t('cloudrun.rollback')}
        </Button>
      </div>
    )}
  </Card>
);

export const CloudRunPanel = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [rollbackService, setRollbackService] = useState<string | null>(null);
  const [deployOpen, setDeployOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | undefined>();

  const statusQuery = useQuery({
    queryKey: ['cloudRunStatus'],
    queryFn: () => adminApi.getCloudRunStatus(),
    refetchInterval: 30_000,
    retry: false,
  });

  const metricsQuery = useQuery({
    queryKey: ['cloudRunMetrics'],
    queryFn: () => adminApi.getCloudRunMetrics(),
    refetchInterval: 60_000,
    retry: false,
  });

  const revisionsQuery = useQuery({
    queryKey: ['cloudRunRevisions', rollbackService],
    queryFn: () =>
      rollbackService
        ? adminApi.getCloudRunRevisions(rollbackService)
        : Promise.resolve(null),
    enabled: !!rollbackService,
  });

  const imagesQuery = useQuery({
    queryKey: ['cloudRunImages'],
    queryFn: () => adminApi.getCloudRunImages(),
    enabled: deployOpen,
    retry: false,
  });

  const rollbackMutation = useMutation({
    mutationFn: ({
      service,
      revision,
    }: {
      service: string;
      revision: string;
    }) => adminApi.cloudRunRollback({ service, revision }),
    onSuccess: (r) => {
      message.success(t('cloudrun.rollback_done'));
      setRollbackService(null);
      queryClient.invalidateQueries({ queryKey: ['cloudRunStatus'] });
      void r;
    },
    onError: (e) => message.error((e as Error).message),
  });

  const deployMutation = useMutation({
    mutationFn: (tag: string) => adminApi.cloudRunDeploy({ tag }),
    onSuccess: () => {
      message.success(t('cloudrun.deploy_done'));
      setDeployOpen(false);
      setSelectedTag(undefined);
      queryClient.invalidateQueries({ queryKey: ['cloudRunStatus'] });
    },
    onError: (e) => message.error((e as Error).message),
  });

  // 非 GCP 后端返回 503(或网络错误)-> 整个面板隐藏,不干扰阿里云视图
  if (statusQuery.isError || (!statusQuery.isLoading && !statusQuery.data)) {
    return null;
  }
  const services = statusQuery.data?.data ?? [];
  if (!statusQuery.isLoading && services.length === 0) {
    return null;
  }

  return (
    <Card
      className="mt-4"
      title={
        <Space>
          <CloudServerOutlined />
          {t('cloudrun.title')}
        </Space>
      }
      extra={
        <Button
          type="primary"
          icon={<UploadOutlined />}
          onClick={() => setDeployOpen(true)}
        >
          {t('cloudrun.deploy_version')}
        </Button>
      }
      loading={statusQuery.isLoading}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {services.map((svc) => (
          <StatusCard
            key={svc.name}
            svc={svc}
            metrics={metricsQuery.data?.data.services[svc.name]}
            onRollback={setRollbackService}
            t={t}
          />
        ))}
      </div>

      {/* 回滚:选历史 revision 切流量 */}
      <Modal
        title={t('cloudrun.rollback_title', { service: rollbackService ?? '' })}
        open={!!rollbackService}
        onCancel={() => setRollbackService(null)}
        footer={null}
        width={680}
      >
        <Table
          size="small"
          loading={revisionsQuery.isLoading}
          dataSource={revisionsQuery.data?.data ?? []}
          rowKey="name"
          pagination={{ pageSize: 8, size: 'small' }}
          columns={[
            { title: t('cloudrun.revision'), dataIndex: 'name', key: 'name' },
            {
              title: t('cloudrun.image'),
              dataIndex: 'image',
              key: 'image',
              render: (v: string | null) => <code>{v ?? '-'}</code>,
            },
            {
              title: t('cloudrun.created'),
              dataIndex: 'createTime',
              key: 'createTime',
              render: (v: string | null) =>
                v ? dayjs(v).format('MM-DD HH:mm') : '-',
            },
            {
              title: t('cloudrun.status'),
              key: 'serving',
              render: (_v, r: CloudRunRevision) =>
                r.serving ? (
                  <Tag color="green">
                    {t('cloudrun.serving')} {r.trafficPercent}%
                  </Tag>
                ) : (
                  <Tag>{t('cloudrun.idle')}</Tag>
                ),
            },
            {
              title: '',
              key: 'action',
              render: (_v, r: CloudRunRevision) =>
                r.serving ? null : (
                  <Button
                    size="small"
                    type="link"
                    loading={rollbackMutation.isPending}
                    onClick={() =>
                      rollbackService &&
                      rollbackMutation.mutate({
                        service: rollbackService,
                        revision: r.name,
                      })
                    }
                  >
                    {t('cloudrun.switch_here')}
                  </Button>
                ),
            },
          ]}
        />
      </Modal>

      {/* 部署已构建的版本 tag(作用于全部服务 + dailyjob)*/}
      <Modal
        title={t('cloudrun.deploy_title')}
        open={deployOpen}
        onCancel={() => setDeployOpen(false)}
        okText={t('cloudrun.deploy')}
        okButtonProps={{ disabled: !selectedTag, danger: true }}
        confirmLoading={deployMutation.isPending}
        onOk={() => selectedTag && deployMutation.mutate(selectedTag)}
      >
        <Text type="secondary">{t('cloudrun.deploy_desc')}</Text>
        <Select
          className="mt-3 w-full"
          placeholder={t('cloudrun.select_version')}
          loading={imagesQuery.isLoading}
          value={selectedTag}
          onChange={setSelectedTag}
          options={(imagesQuery.data?.data ?? []).map((img) => ({
            value: img.tag,
            label: img.updateTime
              ? `${img.tag}  (${dayjs(img.updateTime).format('MM-DD HH:mm')})`
              : img.tag,
          }))}
        />
      </Modal>
    </Card>
  );
};
