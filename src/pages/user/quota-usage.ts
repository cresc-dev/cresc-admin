import type { QuotaUsageRow } from './quota-details';

/** Pure arithmetic for the account page quota rows: per-app maximum, share and over-limit status */

// Per-app counts may still be pending, so a missing one counts as 0; with no apps at all the answer is 0, not -Infinity
export const getMaxCount = (counts: Array<number | undefined>) =>
  Math.max(0, ...counts.map((count) => count ?? 0));

export const getQuotaUsage = (used: number, limit: number) => ({
  percent: Math.min(100, (used / limit) * 100),
  status: used > limit ? ('exception' as const) : ('normal' as const),
});

export function buildQuotaUsageRows({
  t,
  quota,
  appCount,
  maxVersionCount,
  maxPackageCount,
  isVersionCountLoading,
  isPackageCountLoading,
}: {
  t: (key: string) => string;
  quota: Pick<Quota, 'app' | 'bundle' | 'package'>;
  appCount: number;
  maxVersionCount: number;
  maxPackageCount: number;
  isVersionCountLoading: boolean;
  isPackageCountLoading: boolean;
}): QuotaUsageRow[] {
  const appUsage = getQuotaUsage(appCount, quota.app);
  const bundleUsage = getQuotaUsage(maxVersionCount, quota.bundle);
  const packageUsage = getQuotaUsage(maxPackageCount, quota.package);

  return [
    {
      key: 'app',
      label: t('user.apps'),
      limit: quota.app,
      note: t('user.apps_note'),
      percent: appUsage.percent,
      status: appUsage.status,
      value: `${appCount.toLocaleString()} / ${quota.app.toLocaleString()}`,
    },
    {
      key: 'bundle',
      label: t('user.ota_bundles'),
      limit: quota.bundle,
      loading: isVersionCountLoading,
      note: isVersionCountLoading
        ? t('user.counting_bundles')
        : t('user.highest_usage'),
      // While still counting, keep the bar at zero rather than showing partial data
      percent: isVersionCountLoading ? 0 : bundleUsage.percent,
      status: bundleUsage.status,
      value: isVersionCountLoading
        ? t('user.counting')
        : `${maxVersionCount.toLocaleString()} / ${quota.bundle.toLocaleString()}`,
    },
    {
      key: 'package',
      label: t('user.native_packages'),
      limit: quota.package,
      loading: isPackageCountLoading,
      note: isPackageCountLoading
        ? t('user.counting_packages')
        : t('user.highest_usage'),
      percent: isPackageCountLoading ? 0 : packageUsage.percent,
      status: packageUsage.status,
      value: isPackageCountLoading
        ? t('user.counting')
        : `${maxPackageCount.toLocaleString()} / ${quota.package.toLocaleString()}`,
    },
  ];
}
