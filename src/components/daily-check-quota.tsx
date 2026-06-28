import { WarningOutlined } from '@ant-design/icons';
import { Alert, Progress, Tag, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { quotas } from '@/constants/quotas';
import { useUserInfo } from '@/utils/hooks';

const { Text } = Typography;

interface DailyCheckQuotaProps {
  variant: 'account';
}

const useDailyCheckQuotaState = () => {
  const { t } = useTranslation();
  const { user } = useUserInfo();
  const quota = user
    ? (user.quota ?? quotas[user.tier as keyof typeof quotas])
    : undefined;
  const dailyQuota = quota?.pv;
  const remaining = user?.checkQuota;
  const hasData = !!dailyQuota && typeof remaining === 'number';

  const remainingRatio = hasData ? remaining / dailyQuota : 0;
  const percent = Math.max(0, Math.min(100, remainingRatio * 100));
  const isExceeded = hasData && remaining <= 0;
  const isLow = !isExceeded && remainingRatio <= 0.2;
  const status: 'exception' | 'normal' =
    isExceeded || isLow ? 'exception' : 'normal';
  const tooltip = (
    <div className="text-xs">
      {user && (
        <>
          <div>
            {t('daily_check_quota.tier')}{' '}
            {quota?.title ??
              quotas[user.tier as keyof typeof quotas]?.title ??
              user.tier}
          </div>
          {user.cancelAtPeriodEnd && user.tierExpiresAt && (
            <div>
              {t('daily_check_quota.expires')}{' '}
              {dayjs(user.tierExpiresAt).format('YYYY-MM-DD')}
            </div>
          )}
        </>
      )}
      {hasData && (
        <>
          <div>
            {t('daily_check_quota.remaining_today')}{' '}
            {Math.max(0, remaining).toLocaleString()} /{' '}
            {dailyQuota.toLocaleString()} {t('daily_check_quota.checks')}
          </div>
          {remaining < 0 && (
            <div>
              {t('daily_check_quota.over_quota')}{' '}
              {Math.abs(remaining).toLocaleString()}{' '}
              {t('daily_check_quota.checks')}
            </div>
          )}
        </>
      )}
      {user?.last7dAvg !== undefined && (
        <div>
          {t('daily_check_quota.avg_remaining')}{' '}
          {user.last7dAvg.toLocaleString()} {t('daily_check_quota.checks')}
        </div>
      )}
    </div>
  );

  return {
    hasData,
    isExceeded,
    isLow,
    percent,
    status,
    tooltip,
    user,
  };
};

export function DailyCheckQuotaUserTrigger({
  compact = false,
  showPlanDetails = false,
  userName,
}: {
  compact?: boolean;
  showPlanDetails?: boolean;
  userName: string;
}) {
  const { t } = useTranslation();
  const quotaState = useDailyCheckQuotaState();
  const { user } = quotaState;
  const strokeColor = quotaState.isExceeded
    ? '#ef4444'
    : quotaState.isLow
      ? '#f59e0b'
      : '#2563eb';
  const tierTitle = user
    ? (user.quota?.title ??
      quotas[user.tier as keyof typeof quotas]?.title ??
      user.tier)
    : '';
  const expireLabel =
    user?.cancelAtPeriodEnd && user.tierExpiresAt
      ? t('daily_check_quota.expires_date', {
          date: dayjs(user.tierExpiresAt).format('YYYY-MM-DD'),
        })
      : null;
  const planDetails = [tierTitle, expireLabel].filter(Boolean).join(' · ');
  const warningIcon = (quotaState.isExceeded || quotaState.isLow) && (
    <WarningOutlined
      className={`shrink-0 ${
        quotaState.isExceeded ? 'text-red-500' : 'text-amber-500'
      }`}
    />
  );
  const progress = quotaState.hasData && (
    <Progress
      className="mt-0.5"
      percent={quotaState.percent}
      showInfo={false}
      size="small"
      status={quotaState.status}
      strokeColor={strokeColor}
      trailColor="#e5e7eb"
    />
  );
  const content = compact ? (
    <span className="flex h-10 w-16 min-w-0 flex-col justify-center text-left">
      <span className="flex min-w-0 items-center gap-1">
        <span className="truncate font-medium text-[11px] text-slate-600 leading-4">
          {userName}
        </span>
        {warningIcon}
      </span>
      {progress}
    </span>
  ) : (
    <span className="flex min-w-0 items-center gap-2.5 text-left">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-slate-800 text-sm leading-5">
          {userName}
        </span>
        {showPlanDetails && user && (
          <span className="block truncate text-[11px] text-slate-500 leading-4">
            {planDetails}
          </span>
        )}
        {progress}
      </span>
      {warningIcon}
    </span>
  );

  if (!quotaState.hasData) {
    return content;
  }

  return <Tooltip title={quotaState.tooltip}>{content}</Tooltip>;
}

export default function DailyCheckQuota(_props: DailyCheckQuotaProps) {
  const { t } = useTranslation();
  const quotaState = useDailyCheckQuotaState();
  const { user } = quotaState;
  if (!user) {
    return null;
  }

  if (!quotaState.hasData) {
    return (
      <Text type="secondary">{t('daily_check_quota.quota_not_available')}</Text>
    );
  }

  const message = quotaState.isExceeded
    ? t('daily_check_quota.quota_exhausted')
    : quotaState.isLow
      ? t('daily_check_quota.quota_low')
      : t('daily_check_quota.quota_healthy');

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-medium">{t('daily_check_quota.title')}</div>
            <div className="text-gray-500 text-sm">
              {t('daily_check_quota.description')}
            </div>
          </div>
          <Tag
            color={
              quotaState.isExceeded
                ? 'red'
                : quotaState.isLow
                  ? 'orange'
                  : 'green'
            }
          >
            {quotaState.isExceeded
              ? t('daily_check_quota.status_exhausted')
              : quotaState.isLow
                ? t('daily_check_quota.status_low')
                : t('daily_check_quota.status_healthy')}
          </Tag>
        </div>
        <Tooltip title={quotaState.tooltip}>
          <Progress
            percent={quotaState.percent}
            showInfo={false}
            status={quotaState.status}
            strokeLinecap="round"
          />
        </Tooltip>
        <div className="mt-2 text-gray-500 text-xs">
          {t('daily_check_quota.hint')}
        </div>
      </div>
      {(quotaState.isExceeded || quotaState.isLow) && (
        <Alert
          showIcon
          type={quotaState.isExceeded ? 'error' : 'warning'}
          message={message}
        />
      )}
    </div>
  );
}
