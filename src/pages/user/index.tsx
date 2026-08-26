import { LogoutOutlined } from '@ant-design/icons';
import { useQueries } from '@tanstack/react-query';
import { Button, Descriptions, Grid, message, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { logout } from '@/services/auth';
import { useAppList, useUserInfo } from '@/utils/hooks';
import { PRICING_LINK } from '../../constants/links';
import { quotas } from '../../constants/quotas';
import { EmailChangeButton, PasswordChangeButton } from './account-security';
import { subscriptionControlState } from './billing';
import { CancelResumeButton, UpgradeDropdown } from './purchase-controls';
import { QuotaDetailsPanel } from './quota-details';
import { buildQuotaUsageRows, getMaxCount } from './quota-usage';

function UserPanel() {
  const { t } = useTranslation();
  const { user, displayExpireDay, displayRemainingDays } = useUserInfo();
  const { apps } = useAppList();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const appList = apps ?? [];
  const versionCountQueries = useQueries({
    queries: appList.map((app) => ({
      queryKey: ['accountQuotaVersions', app.id],
      queryFn: () => api.getVersions({ appId: app.id, limit: 1 }),
      staleTime: 60_000,
    })),
  });
  const packageCountQueries = useQueries({
    queries: appList.map((app) => ({
      queryKey: ['accountQuotaPackages', app.id],
      queryFn: () => api.getPackageCount(app.id),
      staleTime: 60_000,
    })),
  });

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }
  const { name, email, tier, quota } = user;
  const defaultQuota = quotas[tier as keyof typeof quotas];
  const currentQuota = quota || defaultQuota;
  const appCount = appList.length;
  const versionCounts = versionCountQueries.map((query) => query.data?.count);
  const isVersionCountLoading = versionCountQueries.some(
    (query) => query.isLoading,
  );
  const packageCounts = packageCountQueries.map((query) => query.data);
  const isPackageCountLoading = packageCountQueries.some(
    (query) => query.isLoading,
  );
  const maxVersionCount = getMaxCount(versionCounts);
  const maxPackageCount = getMaxCount(packageCounts);
  const remainingChecks = user.checkQuota;
  const quotaUsageRows = buildQuotaUsageRows({
    t,
    quota: currentQuota,
    appCount,
    maxVersionCount,
    maxPackageCount,
    isVersionCountLoading,
    isPackageCountLoading,
  });
  const quotaSizeLimits = [
    {
      label: t('user.ota_bundle_size'),
      value: currentQuota.bundleSize,
    },
    {
      label: t('user.daily_checks_limit'),
      value: `${currentQuota.pv.toLocaleString()} / day`,
    },
  ];
  const handleLogout = () => {
    message.info(t('user.logged_out'));
    logout();
  };
  const { canManage: canManageSubscription, pendingCancellation } =
    subscriptionControlState(user);

  return (
    <div className="body">
      <Descriptions
        title={t('user.account_info')}
        column={1}
        layout={isMobile ? 'vertical' : 'horizontal'}
        size={isMobile ? 'small' : undefined}
        styles={{
          content: { wordBreak: 'break-word' },
          label: isMobile ? undefined : { width: 134 },
        }}
        bordered
      >
        <Descriptions.Item label={t('user.username')}>{name}</Descriptions.Item>
        <Descriptions.Item label={t('user.email')}>
          <span className="break-all">{email}</span>
        </Descriptions.Item>
        <Descriptions.Item label={t('user.security_settings')}>
          <div className="flex flex-wrap items-center gap-3">
            <EmailChangeButton currentEmail={email} />
            <PasswordChangeButton />
          </div>
        </Descriptions.Item>
        <Descriptions.Item label={t('user.subscription')}>
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex items-center gap-2 shrink-0">
                <span className="whitespace-nowrap">{currentQuota.title}</span>
                {pendingCancellation && (
                  <span
                    className="whitespace-nowrap"
                    style={{ color: '#faad14', fontSize: 12 }}
                  >
                    {t('user.cancelling')}
                  </span>
                )}
              </div>
              {!quota && defaultQuota && (
                <UpgradeDropdown
                  currentQuota={defaultQuota}
                  currentTier={tier}
                  tierExpiresAt={user.tierExpiresAt}
                />
              )}
            </div>
            {tier !== 'free' && canManageSubscription && (
              <div className="max-w-2xl text-sm leading-6 text-slate-500">
                {t('user.upgrade_note')}
              </div>
            )}
          </div>
        </Descriptions.Item>
        <Descriptions.Item
          label={
            pendingCancellation
              ? t('user.expiration_date')
              : t('user.next_billing')
          }
        >
          <div className="grid min-w-0 grid-cols-1 items-center gap-x-3 gap-y-2 sm:grid-cols-[10rem_max-content]">
            {displayExpireDay ? (
              <div className="flex min-w-0 flex-col">
                {displayExpireDay}
                {pendingCancellation && displayRemainingDays && (
                  <>
                    <br />
                    <div>{displayRemainingDays}</div>
                  </>
                )}
              </div>
            ) : (
              t('user.not_available')
            )}
            {tier !== 'free' && canManageSubscription && (
              <CancelResumeButton cancelAtPeriodEnd={pendingCancellation} />
            )}
          </div>
        </Descriptions.Item>
        <Descriptions.Item label={t('user.quota_details')}>
          <QuotaDetailsPanel
            dailyQuota={currentQuota.pv}
            last7dAvg={user.last7dAvg}
            last7dCounts={user.last7dCounts}
            remainingChecks={remainingChecks}
            rows={quotaUsageRows}
            sizeLimits={quotaSizeLimits}
          />
        </Descriptions.Item>
      </Descriptions>
      <br />
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Button
          href={PRICING_LINK}
          target="_blank"
          className="w-full md:w-auto"
        >
          {t('user.view_pricing')}
        </Button>
        <Button
          danger
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          className="w-full md:w-auto"
        >
          {t('user.logout')}
        </Button>
      </div>
    </div>
  );
}

export const Component = UserPanel;
