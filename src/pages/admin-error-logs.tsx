import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '@/services/admin-api';
import { patchSearchParams } from '@/utils/helper';
import { adminKeys } from '@/utils/query-keys';
import {
  ERROR_LOG_HOURS,
  ERROR_LOG_SEVERITIES,
  ERROR_LOG_SOURCES,
  type ErrorLogEntry,
  flattenErrorLogPages,
  parseErrorLogFilters,
  severityColor,
  summarizeFields,
} from './admin-error-logs.logic';

const { Paragraph, Text, Title } = Typography;

export const Component = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseErrorLogFilters(searchParams);
  const [searchInput, setSearchInput] = useState(filters.q);

  useEffect(() => {
    setSearchInput(filters.q);
  }, [filters.q]);

  const logsQuery = useInfiniteQuery({
    queryKey: adminKeys.errorLogs(filters),
    queryFn: ({ pageParam }) => adminApi.getErrorLogs(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data?.nextPageToken || undefined,
    retry: false,
  });

  const entries = flattenErrorLogPages(
    logsQuery.data?.pages.map((page) => page.data),
  );

  const columns: ColumnsType<ErrorLogEntry> = [
    {
      title: t('admin_error_logs.time'),
      dataIndex: 'timestamp',
      width: 170,
      render: (value: string) => (
        <Tooltip title={value}>
          <Text className="whitespace-nowrap">
            {dayjs(value).format('MM-DD HH:mm:ss')}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: t('admin_error_logs.severity'),
      dataIndex: 'severity',
      width: 100,
      render: (value: string) => (
        <Tag color={severityColor(value)}>{value}</Tag>
      ),
    },
    {
      title: t('admin_error_logs.source'),
      dataIndex: 'source',
      width: 150,
      render: (value: string, entry) => (
        <Tooltip title={entry.revision}>
          <Text className="whitespace-nowrap">{value}</Text>
        </Tooltip>
      ),
    },
    {
      title: t('admin_error_logs.message'),
      dataIndex: 'message',
      render: (value: string, entry) => (
        <div className="min-w-0">
          <Text strong>{value || '-'}</Text>
          {entry.fields && (
            <div>
              <Text type="secondary" className="break-all text-xs">
                {summarizeFields(entry.fields)}
              </Text>
            </div>
          )}
        </div>
      ),
    },
  ];

  const errorMessage =
    logsQuery.error instanceof Error ? logsQuery.error.message : undefined;

  return (
    <div className="page-section">
      <div className="mb-4">
        <Title level={4} className="m-0!">
          {t('admin_error_logs.title')}
        </Title>
        <Text type="secondary">{t('admin_error_logs.description')}</Text>
      </div>
      <Space wrap className="mb-4">
        <Select
          value={filters.source}
          style={{ width: 170 }}
          onChange={(value) =>
            patchSearchParams(setSearchParams, {
              source: value === 'all' ? null : value,
            })
          }
          options={ERROR_LOG_SOURCES.map((value) => ({
            value,
            label: value === 'all' ? t('admin_error_logs.all_sources') : value,
          }))}
        />
        <Select
          value={filters.severity}
          style={{ width: 150 }}
          onChange={(value) =>
            patchSearchParams(setSearchParams, {
              severity: value === 'ERROR' ? null : value,
            })
          }
          options={ERROR_LOG_SEVERITIES.map((value) => ({
            value,
            label: t(`admin_error_logs.severity_${value.toLowerCase()}`),
          }))}
        />
        <Select
          value={filters.hours}
          style={{ width: 130 }}
          onChange={(value) =>
            patchSearchParams(setSearchParams, {
              hours: value === 24 ? null : String(value),
            })
          }
          options={ERROR_LOG_HOURS.map((value) => ({
            value,
            label: t('admin_error_logs.last_hours', { count: value }),
          }))}
        />
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t('admin_error_logs.search_placeholder')}
          style={{ width: 240 }}
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value);
            if (!event.target.value) {
              patchSearchParams(setSearchParams, { q: null });
            }
          }}
          onPressEnter={() =>
            patchSearchParams(setSearchParams, {
              q: searchInput.trim() || null,
            })
          }
        />
        <Button
          icon={<ReloadOutlined />}
          loading={logsQuery.isFetching && !logsQuery.isFetchingNextPage}
          onClick={() => logsQuery.refetch()}
        >
          {t('admin_error_logs.refresh')}
        </Button>
      </Space>
      {logsQuery.isError && (
        <Alert
          className="mb-4"
          type="error"
          showIcon
          message={t('admin_error_logs.load_failed')}
          description={errorMessage}
        />
      )}
      <Table
        rowKey={(entry) => `${entry.insertId}:${entry.timestamp}`}
        size="small"
        columns={columns}
        dataSource={entries}
        loading={logsQuery.isLoading}
        pagination={false}
        scroll={{ x: 800 }}
        locale={{ emptyText: t('admin_error_logs.empty') }}
        expandable={{
          rowExpandable: (entry) => Boolean(entry.fields || entry.revision),
          expandedRowRender: (entry) => (
            <div className="min-w-0">
              {entry.revision && (
                <Text type="secondary" className="text-xs">
                  {entry.revision} · {entry.timestamp}
                </Text>
              )}
              {entry.fields && (
                <Paragraph
                  copyable
                  className="m-0! whitespace-pre-wrap break-all font-mono text-xs"
                >
                  {JSON.stringify(entry.fields, null, 2)}
                </Paragraph>
              )}
            </div>
          ),
        }}
      />
      {logsQuery.hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button
            loading={logsQuery.isFetchingNextPage}
            onClick={() => logsQuery.fetchNextPage()}
          >
            {t('admin_error_logs.load_more')}
          </Button>
        </div>
      )}
    </div>
  );
};
