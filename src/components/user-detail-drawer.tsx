import { LineChartOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Collapse,
  Descriptions,
  Drawer,
  Space,
  Spin,
  Table,
} from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { rootRouterPath } from '@/router';
import { adminApi } from '@/services/admin-api';

// Collapse 面板默认首次展开才挂载子内容，借此实现按需拉取包列表
const AppPackagesTable = ({ appId }: { appId: number }) => {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['adminAppPackages', appId],
    queryFn: () => adminApi.getAppPackages(appId),
  });

  const translate = (key: string, fallback: string) => {
    const val = t(key);
    return val && val !== key ? val : fallback;
  };

  return (
    <Table
      dataSource={data?.data ?? []}
      rowKey="id"
      loading={isLoading}
      pagination={{ pageSize: 5, size: 'small' }}
      size="small"
      columns={[
        {
          title: 'ID',
          dataIndex: 'id',
          key: 'id',
          width: 60,
        },
        {
          title: translate('admin_users.pkg_name', 'Package/Version'),
          dataIndex: 'name',
          key: 'name',
        },
        {
          title: 'Hash',
          dataIndex: 'hash',
          key: 'hash',
          width: 100,
          render: (h: string) => (
            <code className="text-xs">{h.slice(0, 8)}</code>
          ),
        },
        {
          title: 'Build',
          key: 'build',
          render: (_, r) => r.buildTime || '-',
        },
        {
          title: translate('admin_users.col_status', 'Status'),
          dataIndex: 'status',
          key: 'status',
          width: 80,
        },
        {
          title: translate('admin_users.col_note', 'Note'),
          dataIndex: 'note',
          key: 'note',
        },
      ]}
    />
  );
};

export const UserDetailDrawer = ({
  userId,
  open,
  onClose,
  isMobile,
  t,
}: {
  userId: number | null;
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
  t?: (key: string) => string;
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['adminUserDetail', userId],
    queryFn: () => (userId ? adminApi.getUserDetail(userId) : null),
    enabled: !!userId && open,
  });

  const translate = (key: string, fallback: string) => {
    if (t) {
      // Return translation if key is known, otherwise fallback
      const val = t(key);
      if (val && val !== key) return val;
    }
    return fallback;
  };

  const detail = data;

  return (
    <Drawer
      title={translate('admin_users.detail_title', 'User Detail')}
      width={isMobile ? '100%' : 720}
      onClose={onClose}
      open={open}
      destroyOnHidden
    >
      <Spin spinning={isLoading}>
        {detail && (
          <Space direction="vertical" size="large" className="w-full">
            <Descriptions
              title={translate('admin_users.basic_info', 'Basic Info')}
              bordered
              column={2}
            >
              <Descriptions.Item label="ID">{detail.user.id}</Descriptions.Item>
              <Descriptions.Item
                label={translate('admin_users.col_name', 'Username')}
              >
                {detail.user.name}
              </Descriptions.Item>
              <Descriptions.Item
                label={translate('admin_users.col_email', 'Email')}
                span={2}
              >
                {detail.user.email}
              </Descriptions.Item>
              <Descriptions.Item
                label={translate('admin_users.col_status', 'Status')}
              >
                <Badge
                  status={
                    detail.user.status === 'normal'
                      ? 'success'
                      : detail.user.status === 'dormant'
                        ? 'default'
                        : 'warning'
                  }
                  text={
                    detail.user.status === 'normal'
                      ? translate('admin_users.status_normal', 'Normal')
                      : detail.user.status === 'dormant'
                        ? translate('admin_users.status_dormant', 'Dormant')
                        : translate(
                            'admin_users.status_unverified',
                            'Unverified',
                          )
                  }
                />
              </Descriptions.Item>
              <Descriptions.Item
                label={translate('admin_users.col_tier', 'Tier')}
              >
                {detail.user.tier}
              </Descriptions.Item>
              <Descriptions.Item
                label={translate('admin_users.col_tier_expires', 'Expiry')}
                span={2}
              >
                {detail.user.tierExpiresAt
                  ? dayjs(detail.user.tierExpiresAt).format('YYYY-MM-DD HH:mm')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={translate('admin_users.col_created', 'Registered At')}
              >
                {detail.user.createdAt
                  ? dayjs(detail.user.createdAt).format('YYYY-MM-DD HH:mm')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={translate(
                  'admin_users.last_operation',
                  'Last Operation',
                )}
              >
                {detail.activity?.lastOperationAt
                  ? dayjs(detail.activity.lastOperationAt).format(
                      'YYYY-MM-DD HH:mm',
                    )
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={translate(
                  'admin_users.dormant_marked_at',
                  'Dormant Marked At',
                )}
                span={2}
              >
                {detail.activity?.dormantMarkedAt
                  ? dayjs(detail.activity.dormantMarkedAt).format(
                      'YYYY-MM-DD HH:mm',
                    )
                  : '-'}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions
              title={translate('admin_users.quota_usage', 'Quota & PV Usage')}
              bordered
              column={2}
            >
              <Descriptions.Item
                label={translate('admin_users.pv_limit', 'Daily Limit')}
              >
                {detail.quotaDetail.limit.pv} pv
              </Descriptions.Item>
              <Descriptions.Item
                label={translate('admin_users.today_used', 'Today Used')}
              >
                {detail.quotaDetail.todayUsed} pv
              </Descriptions.Item>
              <Descriptions.Item
                label={translate('admin_users.today_remaining', 'Remaining')}
              >
                {detail.quotaDetail.todayRemaining} pv
              </Descriptions.Item>
              <Descriptions.Item
                label={translate('admin_users.avg_7_days', '7d Avg')}
              >
                {detail.quotaDetail.last7Days.avg} pv
              </Descriptions.Item>
              <Descriptions.Item
                label={translate(
                  'admin_users.last_7_days_details',
                  'Last 7 Days Details',
                )}
                span={2}
              >
                {detail.quotaDetail.last7Days.counts
                  .slice()
                  .reverse()
                  .map((c, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: list order is static
                    <span key={i} className="mr-3 inline-block">
                      Day {i + 1}: <strong>{c}</strong>
                    </span>
                  ))}
              </Descriptions.Item>
              <Descriptions.Item
                label={translate('admin_users.app_limit', 'App Limit')}
              >
                {detail.apps.length} / {detail.quotaDetail.limit.app}
              </Descriptions.Item>
              <Descriptions.Item
                label={translate('admin_users.package_limit', 'Package Limit')}
              >
                {detail.quotaDetail.limit.package} pkg
              </Descriptions.Item>
            </Descriptions>

            <div>
              <div
                className="ant-descriptions-title"
                style={{ marginBottom: 12 }}
              >
                {translate(
                  'admin_users.apps_and_packages',
                  'Apps & Native Packages',
                )}
              </div>
              <Collapse>
                {detail.apps.map((app) => (
                  <Collapse.Panel
                    key={app.id}
                    header={
                      <div className="flex w-full justify-between pr-4 items-center">
                        <span>
                          <strong>{app.name}</strong> ({app.platform})
                        </span>
                        <Space size="middle">
                          <span>
                            PV: <strong>{app.checkCount}</strong>
                          </span>
                          <span>
                            {translate(
                              'admin_users.packages_count',
                              'Packages',
                            )}
                            : <strong>{app.packagesCount}</strong>
                          </span>
                          <Link
                            to={`${rootRouterPath.realtimeMetrics}?${new URLSearchParams(
                              { appKey: app.appKey },
                            ).toString()}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Button
                              type="link"
                              size="small"
                              icon={<LineChartOutlined />}
                              className="p-0!"
                            >
                              {translate('admin_apps.metrics', 'Metrics')}
                            </Button>
                          </Link>
                        </Space>
                      </div>
                    }
                  >
                    <Space direction="vertical" className="w-full">
                      <div className="text-xs text-gray-500 mb-2">
                        App Key: <code>{app.appKey}</code>
                      </div>
                      <AppPackagesTable appId={app.id} />
                    </Space>
                  </Collapse.Panel>
                ))}
              </Collapse>
            </div>
          </Space>
        )}
      </Spin>
    </Drawer>
  );
};
