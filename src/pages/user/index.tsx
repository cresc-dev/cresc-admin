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
import { CancelResumeButton, UpgradeDropdown } from './purchase-controls';
import { QuotaDetailsPanel, type QuotaUsageRow } from './quota-details';

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
      queryFn: () => api.getPackages(app.id),
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
  const { name, email, tier, quota, cancelAtPeriodEnd } = user;
  const defaultQuota = quotas[tier as keyof typeof quotas];
  const currentQuota = quota || defaultQuota;
  const appCount = appList.length;
  const versionCounts = versionCountQueries.map((query) => query.data?.count);
  const isVersionCountLoading = versionCountQueries.some(
    (query) => query.isLoading,
  );
  const packageCounts = packageCountQueries.map(
    (query) => query.data?.count ?? query.data?.data?.length,
  );
  const isPackageCountLoading = packageCountQueries.some(
    (query) => query.isLoading,
  );
  const maxVersionCount = Math.max(
    0,
    ...versionCounts.map((count) => count ?? 0),
  );
  const maxPackageCount = Math.max(
    0,
    ...packageCounts.map((count) => count ?? 0),
  );
  const remainingChecks = user.checkQuota;
  const quotaUsageRows: QuotaUsageRow[] = [
    {
      key: 'app',
      label: t('user.apps'),
      limit: currentQuota.app,
      note: t('user.apps_note'),
      percent: Math.min(100, (appCount / currentQuota.app) * 100),
      status: appCount > currentQuota.app ? 'exception' : 'normal',
      value: `${appCount.toLocaleString()} / ${currentQuota.app.toLocaleString()}`,
    },
    {
      key: 'bundle',
      label: t('user.ota_bundles'),
      limit: currentQuota.bundle,
      loading: isVersionCountLoading,
      note: isVersionCountLoading
        ? t('user.counting_bundles')
        : t('user.highest_usage'),
      percent: isVersionCountLoading
        ? 0
        : Math.min(100, (maxVersionCount / currentQuota.bundle) * 100),
      status: maxVersionCount > currentQuota.bundle ? 'exception' : 'normal',
      value: isVersionCountLoading
        ? t('user.counting')
        : `${maxVersionCount.toLocaleString()} / ${currentQuota.bundle.toLocaleString()}`,
    },
    {
      key: 'package',
      label: t('user.native_packages'),
      limit: currentQuota.package,
      loading: isPackageCountLoading,
      note: isPackageCountLoading
        ? t('user.counting_packages')
        : t('user.highest_usage'),
      percent: isPackageCountLoading
        ? 0
        : Math.min(100, (maxPackageCount / currentQuota.package) * 100),
      status: maxPackageCount > currentQuota.package ? 'exception' : 'normal',
      value: isPackageCountLoading
        ? t('user.counting')
        : `${maxPackageCount.toLocaleString()} / ${currentQuota.package.toLocaleString()}`,
    },
  ];
  const quotaSizeLimits = [
    {
      label: t('user.native_package_size'),
      value: currentQuota.packageSize,
    },
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
  const canManageSubscription = typeof cancelAtPeriodEnd === 'boolean';

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
                {cancelAtPeriodEnd && (
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
            cancelAtPeriodEnd
              ? t('user.expiration_date')
              : t('user.next_billing')
          }
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {displayExpireDay ? (
              <div className="flex min-w-0 flex-col">
                {displayExpireDay}
                {cancelAtPeriodEnd && displayRemainingDays && (
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
              <CancelResumeButton cancelAtPeriodEnd={cancelAtPeriodEnd} />
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
