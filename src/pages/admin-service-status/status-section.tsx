import {
  Card,
  type CardProps,
  Space,
  Statistic,
  type StatisticProps,
  Typography,
} from 'antd';
import type { ReactNode } from 'react';

const { Text } = Typography;

/**
 * Shell of the ops panels at the bottom of the service status page: titled
 * with an icon, extra info at the top right, loading state. Hidden entirely on
 * error (older servers lack the endpoint); with `empty`, also hidden when
 * loading finishes without data. A panel that passes no `loading` is treated
 * as empty while loading, i.e. it appears once the data arrives.
 */
export function StatusSection({
  children,
  empty = false,
  error,
  extra,
  icon,
  loading,
  title,
  titleExtra,
}: {
  children: ReactNode;
  empty?: boolean;
  error: boolean;
  extra?: ReactNode;
  icon: ReactNode;
  loading?: boolean;
  title: ReactNode;
  /** Content appended after the title (e.g. version or role tags) */
  titleExtra?: ReactNode;
}) {
  if (error || (!loading && empty)) {
    return null;
  }
  return (
    <Card
      className="mt-4"
      extra={extra}
      loading={loading}
      title={
        <Space wrap>
          {icon}
          {title}
          {titleExtra}
        </Space>
      }
    >
      {children}
    </Card>
  );
}

/** Small metric card: a Statistic plus one detail line; anything else (progress bars, tags) goes in children. */
export function StatCard({
  children,
  detail,
  detailType = 'secondary',
  size = 'small',
  suffix,
  title,
  value,
}: {
  children?: ReactNode;
  /** Detail line below the Statistic */
  detail?: ReactNode;
  detailType?: 'secondary' | 'warning' | 'danger';
  size?: CardProps['size'];
  suffix?: ReactNode;
  title: ReactNode;
  value: StatisticProps['value'];
}) {
  return (
    <Card size={size}>
      <Statistic suffix={suffix} title={title} value={value} />
      {detail != null && detail !== false && (
        <Text type={detailType}>{detail}</Text>
      )}
      {children}
    </Card>
  );
}
