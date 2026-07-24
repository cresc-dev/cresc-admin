import { GlobalOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Card, Space, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/services/admin-api';
import { formatCount } from './metrics';

const { Text } = Typography;

const TOP_COUNTRY_LIMIT = 6;

const topCountries = (countries: Record<string, number>) =>
  Object.entries(countries)
    .sort((left, right) => right[1] - left[1])
    .slice(0, TOP_COUNTRY_LIMIT);

export const UserAnalyticsPanel = () => {
  const { t } = useTranslation();
  const overviewQuery = useQuery({
    queryKey: ['analyticsOverview'],
    queryFn: () => adminApi.getAnalyticsOverview(7),
    refetchInterval: 60_000,
    retry: false,
  });

  const days = overviewQuery.data?.data ?? [];
  const today = days[0];

  if (
    overviewQuery.isError ||
    (!overviewQuery.isLoading && days.length === 0)
  ) {
    return null;
  }

  const columns: ColumnsType<GlobalAnalyticsDay> = [
    { dataIndex: 'date', title: t('user_analytics.col_date'), width: 110 },
    {
      align: 'right',
      dataIndex: 'dau',
      render: (value: number) => formatCount(value),
      title: t('user_analytics.col_dau'),
      width: 90,
    },
    {
      dataIndex: 'countries',
      render: (countries: Record<string, number>) => (
        <Space size={4} wrap>
          {topCountries(countries).map(([country, count]) => (
            <Tag key={country}>
              {country} {formatCount(count)}
            </Tag>
          ))}
        </Space>
      ),
      title: t('user_analytics.col_countries'),
    },
    {
      dataIndex: 'topApps',
      render: (apps: GlobalAnalyticsDay['topApps']) => (
        <Space size={4} wrap>
          {apps.slice(0, 5).map((app) => (
            <Tag color="blue" key={app.appKey}>
              {app.appKey.slice(0, 10)}… {formatCount(app.dau)}
            </Tag>
          ))}
        </Space>
      ),
      title: t('user_analytics.col_top_apps'),
    },
  ];

  return (
    <Card
      className="mt-4"
      loading={overviewQuery.isLoading}
      title={
        <Space>
          <GlobalOutlined />
          {t('user_analytics.title')}
        </Space>
      }
    >
      {today && (
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card size="small">
            <Statistic
              title={t('user_analytics.today_dau')}
              value={today.dau}
            />
          </Card>
          <Card className="md:col-span-2" size="small">
            <Text type="secondary">{t('user_analytics.col_countries')}</Text>
            <div className="mt-2">
              <Space size={4} wrap>
                {topCountries(today.countries).map(([country, count]) => (
                  <Tag key={country}>
                    {country} {formatCount(count)}
                  </Tag>
                ))}
              </Space>
            </div>
          </Card>
        </div>
      )}
      <Table
        columns={columns}
        dataSource={days}
        pagination={false}
        rowKey="date"
        size="small"
      />
    </Card>
  );
};
