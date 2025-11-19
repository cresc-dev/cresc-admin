import { DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { Button, DatePicker, Space, Table, Typography } from 'antd';
import type { ColumnType } from 'antd/lib/table';
import dayjs, { type Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useMemo, useState } from 'react';
import { UAParser } from 'ua-parser-js';
import * as XLSX from 'xlsx';
import { useAuditLogs } from '@/utils/hooks';

const { RangePicker } = DatePicker;

dayjs.extend(relativeTime);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export const getUA = (userAgent: string) => {
  if (userAgent.startsWith('react-native-update-cli')) {
    return <div>cli {userAgent.split('/')[1]}</div>;
  }
  const { browser, os } = UAParser(userAgent);
  return (
    <>
      <div>
        {browser.name} {browser.version}
      </div>
      <div>
        {os.name} {os.version}
      </div>
    </>
  );
};

const { Text } = Typography;

// Replace numbers in path with {id} and remove trailing slashes
const normalizePath = (path: string): string => {
  return path.replace(/\/\d+/g, '/{id}').replace(/\/$/, '');
};

// API action semantic mapping dictionary (write operations only)
const actionMap: Record<string, string> = {
  // User related
  'POST /user/login': 'Login',
  'POST /user/register': 'Register',
  'POST /user/activate': 'Activate Account',
  'POST /user/activate/sendmail': 'Send Activation Email',
  'POST /user/resetpwd/sendmail': 'Send Password Reset Email',
  'POST /user/resetpwd/reset': 'Reset Password',
  // App related
  'POST /app/create': 'Create App',
  'PUT /app/{id}': 'Update App',
  'DELETE /app/{id}': 'Delete App',
  // Order related
  'POST /orders': 'Create Order',
  // File related
  'POST /upload': 'Upload File',
  // Native package related
  'POST /app/{id}/package/create': 'Create Native Package',
  'PUT /app/{id}/package/{id}': 'Update Native Package Settings',
  'DELETE /app/{id}/package/{id}': 'Delete Native Package',
  // Hot update package related
  'POST /app/{id}/version/create': 'Create Hot Update Package',
  'PUT /app/{id}/version/{id}': 'Update Hot Update Package Settings',
  'DELETE /app/{id}/version/{id}': 'Delete Hot Update Package',
  // Binding related
  'POST /app/{id}/binding': 'Create/Update Binding',
  'DELETE /app/{id}/binding/{id}': 'Delete Binding',
  // API key related
  'POST /api-token/create': 'Create API Key',
  'DELETE /api-token/{id}': 'Delete API Key',
};

// Get action semantic description
const getActionLabel = (method: string, path: string): string => {
  const normalizedPath = normalizePath(path);
  const key = `${method.toUpperCase()} ${normalizedPath}`;

  return actionMap[key] || `${method.toUpperCase()} ${path}`;
};

// Generate action type filter
const actionFilters = Object.values(actionMap)
  .sort()
  .map((value) => ({
    text: value,
    value,
  }));

const columns: ColumnType<AuditLog>[] = [
  {
    title: 'Time',
    dataIndex: 'createdAt',
    width: 180,
    sorter: (a, b) =>
      dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
    render: (createdAt: string) => {
      const date = dayjs(createdAt);
      return (
        <div>
          <div>{date.format('YYYY-MM-DD HH:mm:ss')}</div>
          <Text type="secondary" className="text-xs">
            {date.fromNow()}
          </Text>
        </div>
      );
    },
  },
  {
    title: 'Action',
    width: 120,
    filters: actionFilters,
    onFilter: (value, record) => {
      const actionLabel = getActionLabel(record.method, record.path);
      return actionLabel === value;
    },
    render: (_, record) => {
      const actionLabel = getActionLabel(record.method, record.path);
      const isDelete = record.method.toUpperCase() === 'DELETE';
      const color = isDelete ? '#ff4d4f' : undefined;

      return (
        <span
          //   className="text-base font-medium"
          style={color ? { color } : undefined}
        >
          {actionLabel}
        </span>
      );
    },
  },
  {
    title: 'Status Code',
    dataIndex: 'statusCode',
    width: 100,
    render: (statusCode: string) => {
      const code = Number(statusCode);
      const isError = code >= 500;
      const color = isError ? '#ff4d4f' : undefined;

      return (
        <span className="font-medium" style={color ? { color } : undefined}>
          {statusCode}
        </span>
      );
    },
  },
  {
    title: 'Submitted Data',
    width: 300,
    ellipsis: {
      showTitle: false,
    },
    render: (_, { path, data }: AuditLog) => {
      const isUpload = path.startsWith('/upload');
      if (isUpload) {
        if (data?.ext === '.ppk') {
          return <Text>Hot Update Package</Text>;
        } else {
          return <Text>Native Package</Text>;
        }
      }
      if (!data) {
        return <Text type="secondary">-</Text>;
      }
      delete data.deps;
      delete data.commit;
      return (
        <Text ellipsis={{ tooltip: JSON.stringify(data, null, 2) }}>
          {JSON.stringify(data)}
        </Text>
      );
    },
  },
  {
    title: 'Device Info',
    dataIndex: 'userAgent',
    width: 250,
    ellipsis: {
      showTitle: false,
    },
    render: (userAgent: string | undefined, record: AuditLog) => {
      const hasInfo = userAgent || record.ip;
      if (!hasInfo) {
        return <Text type="secondary">-</Text>;
      }

      return (
        <div title={userAgent || record.ip}>
          {userAgent && <div>{getUA(userAgent)}</div>}
          {record.ip && (
            <div className="mt-1">
              <Text type="secondary" className="text-xs">
                IP: {record.ip}
              </Text>
            </div>
          )}
        </div>
      );
    },
  },
  {
    title: 'API Key',
    dataIndex: ['apiTokens', 'tokenSuffix'],
    width: 120,
    render: (tokenSuffix?: string) =>
      tokenSuffix ? (
        <Text className="font-mono text-xs">****{tokenSuffix}</Text>
      ) : (
        <Text type="secondary">-</Text>
      ),
  },
];

export const AuditLogs = () => {
  const [offset, setOffset] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(20);
  const [dateRange, setDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);

  const { auditLogs: allAuditLogs, isLoading } = useAuditLogs({
    offset: 0,
    limit: 1000,
  });

  // Filter logs by date range
  const filteredAuditLogs = useMemo(() => {
    if (!dateRange || (!dateRange[0] && !dateRange[1])) {
      return allAuditLogs;
    }

    const [startDate, endDate] = dateRange;
    return allAuditLogs.filter((log) => {
      const logDate = dayjs(log.createdAt);
      if (startDate && endDate) {
        return (
          logDate.isSameOrAfter(startDate.startOf('day')) &&
          logDate.isSameOrBefore(endDate.endOf('day'))
        );
      }
      if (startDate) {
        return logDate.isSameOrAfter(startDate.startOf('day'));
      }
      if (endDate) {
        return logDate.isSameOrBefore(endDate.endOf('day'));
      }
      return true;
    });
  }, [allAuditLogs, dateRange]);

  const handleDateRangeChange = (
    dates: [Dayjs | null, Dayjs | null] | null,
  ) => {
    // Validate date range does not exceed 180 days
    if (dates?.[0] && dates?.[1]) {
      const startDate = dates[0];
      const endDate = dates[1];
      const diffInDays = endDate.diff(startDate, 'day');

      if (diffInDays > 180) {
        // If exceeds 180 days, automatically adjust to 180 days
        const adjustedEndDate = startDate.add(180, 'day');
        setDateRange([startDate, adjustedEndDate]);
      } else {
        setDateRange(dates);
      }
    } else {
      setDateRange(dates);
    }
    setOffset(0); // Reset to first page
  };

  // Limit date selection: cannot exceed 180 days, cannot select future dates, cannot select dates more than 180 days ago
  const disabledDate = (current: Dayjs | null) => {
    if (!current) return false;

    const today = dayjs();
    const oneHundredEightyDaysAgo = today.subtract(180, 'day');

    // Cannot select future dates
    if (current.isAfter(today, 'day')) {
      return true;
    }

    // Cannot select dates more than 180 days ago (more than 180 days in the past from today)
    if (current.isBefore(oneHundredEightyDaysAgo, 'day')) {
      return true;
    }

    // If start date is already selected, limit end date to not exceed 180 days from start date
    if (dateRange?.[0] && !dateRange[1]) {
      const startDate = dateRange[0];
      const oneHundredEightyDaysLater = startDate.add(180, 'day');
      return (
        current.isBefore(startDate, 'day') ||
        current.isAfter(oneHundredEightyDaysLater, 'day')
      );
    }

    // If end date is already selected, limit start date to not be earlier than 180 days before end date
    if (!dateRange?.[0] && dateRange?.[1]) {
      const endDate = dateRange[1];
      const oneHundredEightyDaysEarlier = endDate.subtract(180, 'day');
      return (
        current.isAfter(endDate, 'day') ||
        current.isBefore(oneHundredEightyDaysEarlier, 'day')
      );
    }

    return false;
  };

  // Export to Excel
  const handleExportToExcel = () => {
    if (filteredAuditLogs.length === 0) {
      return;
    }

    // Format data
    const excelData = filteredAuditLogs.map((log) => {
      const date = dayjs(log.createdAt);
      const actionLabel = getActionLabel(log.method, log.path);

      // Parse UA information
      let browserInfo = '-';
      let osInfo = '-';
      if (log.userAgent) {
        // Handle special CLI useragent format
        if (log.userAgent.startsWith('react-native-update-cli')) {
          const version = log.userAgent.split('/')[1] || '';
          browserInfo = `cli ${version}`.trim();
          osInfo = '-';
        } else {
          const { browser, os } = UAParser(log.userAgent);
          browserInfo =
            `${browser.name || '-'} ${browser.version || ''}`.trim();
          osInfo = `${os.name || '-'} ${os.version || ''}`.trim();
        }
      }

      return {
        Time: date.format('YYYY-MM-DD HH:mm:ss'),
        Action: actionLabel,
        'Status Code': log.statusCode,
        'Submitted Data': log.data ? JSON.stringify(log.data) : '-',
        Browser: browserInfo,
        'Operating System': osInfo,
        'IP Address': log.ip || '-',
        'API Key': `****${log.apiTokens?.tokenSuffix || '-'}`,
      };
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const colWidths = [
      { wch: 20 }, // Time
      { wch: 15 }, // Action
      { wch: 10 }, // Status Code
      { wch: 40 }, // Submitted Data
      { wch: 20 }, // Browser
      { wch: 20 }, // Operating System
      { wch: 15 }, // IP Address
      { wch: 15 }, // API Key
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');

    // Generate filename
    const fileName = `Audit_Logs_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;

    // Export file
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileTextOutlined />
              Audit Logs
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Logging feature started testing on November 17, 2025. No earlier
              data available. Data will only be retained for 180 days.
            </p>
          </div>
          <Space>
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              format="YYYY-MM-DD"
              placeholder={['Start Date', 'End Date']}
              allowClear
              disabledDate={disabledDate}
            />
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExportToExcel}
              disabled={filteredAuditLogs.length === 0}
            >
              Export Excel
            </Button>
          </Space>
        </div>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredAuditLogs}
        loading={isLoading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          total: filteredAuditLogs.length,
          current: offset / pageSize + 1,
          pageSize,
          showTotal: (total) => `Total ${total} records`,
          onChange(page, size) {
            if (size) {
              setOffset((page - 1) * size);
              setPageSize(size);
            }
          },
        }}
        scroll={{ x: 1200 }}
      />
    </div>
  );
};

export const Component = AuditLogs;
