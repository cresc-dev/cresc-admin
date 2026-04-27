import { CreditCardOutlined, LogoutOutlined } from '@ant-design/icons';
import { useQueries } from '@tanstack/react-query';
import type { MenuProps } from 'antd';
import {
  Button,
  Descriptions,
  Dropdown,
  Grid,
  Modal,
  message,
  Popconfirm,
  Progress,
  Spin,
  Tag,
  Tooltip,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { api } from '@/services/api';
import { logout } from '@/services/auth';
import { useAppList, useUserInfo } from '@/utils/hooks';
import { PRICING_LINK } from '../constants/links';
import { products, quotas } from '../constants/quotas';

const CancelResumeButton = ({
  cancelAtPeriodEnd,
}: {
  cancelAtPeriodEnd?: boolean;
}) => {
  const [loading, setLoading] = useState(false);

  if (cancelAtPeriodEnd) {
    return (
      <Popconfirm
        title="Resume subscription?"
        description="Your subscription will continue to renew automatically."
        onConfirm={async () => {
          setLoading(true);
          try {
            await api.resumeSubscription();
            message.success('Subscription resumed.');
          } catch {
            message.error('Failed to resume subscription.');
          } finally {
            setLoading(false);
          }
        }}
        okText="Resume"
        cancelText="No"
      >
        <Button
          type="link"
          loading={loading}
          className="mt-2 self-start px-0 md:mt-0"
        >
          Resume subscription
        </Button>
      </Popconfirm>
    );
  }

  return (
    <Popconfirm
      title="Cancel subscription?"
      description="You will retain access until the end of the current billing period. No refund will be issued."
      onConfirm={async () => {
        setLoading(true);
        try {
          await api.cancelSubscription();
          message.success(
            'Your subscription will end at the end of the current billing period.',
          );
        } catch {
          message.error('Failed to cancel subscription.');
        } finally {
          setLoading(false);
        }
      }}
      okText="Yes, cancel"
      okButtonProps={{ danger: true }}
      cancelText="No"
    >
      <Button
        type="link"
        danger
        loading={loading}
        className="mt-2 self-start px-0 md:mt-0"
      >
        Cancel subscription
      </Button>
    </Popconfirm>
  );
};

const UpgradeDropdown = ({
  currentQuota,
  currentTier,
  tierExpiresAt,
}: {
  currentQuota: (typeof quotas)[keyof typeof quotas];
  currentTier: Tier;
  tierExpiresAt?: string;
}) => {
  const [loading, setLoading] = useState(false);

  // Get all upgradeable tiers
  const getUpgradeOptions = () => {
    const allTiers = [
      { key: 'standard', title: 'Upgrade to Standard', tier: 'standard' },
      { key: 'premium', title: 'Upgrade to Premium', tier: 'premium' },
      { key: 'pro', title: 'Upgrade to Pro', tier: 'pro' },
      { key: 'max', title: 'Upgrade to Max', tier: 'max' },
      { key: 'ultra', title: 'Upgrade to Ultra', tier: 'ultra' },
    ];

    return allTiers.filter(
      (option) =>
        currentQuota.pv < quotas[option.tier as keyof typeof quotas].pv,
    );
  };

  const upgradeOptions = getUpgradeOptions();

  if (upgradeOptions.length === 0) {
    return null; // No upgrade options available
  }

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    confirmUpgrade(key as keyof typeof products);
  };

  const menuItems: MenuProps['items'] = upgradeOptions.map((option) => ({
    key: option.tier,
    label: option.title,
    icon: <CreditCardOutlined />,
  }));

  const handleMainButtonClick = () => {
    // Click main button to select the first upgrade option
    if (upgradeOptions.length > 0) {
      confirmUpgrade(upgradeOptions[0].tier as keyof typeof products);
    }
  };

  const startPurchase = async (targetTier: keyof typeof products) => {
    setLoading(true);
    try {
      await purchase(targetTier);
    } catch {
      setLoading(false);
    }
  };

  const confirmUpgrade = (targetTier: keyof typeof products) => {
    if (currentTier === 'free') {
      startPurchase(targetTier);
      return;
    }

    const preview = calculateUpgradePreview({
      currentTier,
      targetTier,
      tierExpiresAt,
    });
    const targetQuota = quotas[targetTier as keyof typeof quotas];
    const targetTitle = targetQuota?.title || products[targetTier].title;

    Modal.confirm({
      title: `Upgrade to ${targetTitle}?`,
      width: 620,
      okText: 'Continue to payment',
      cancelText: 'Cancel',
      content: (
        <div className="space-y-3 text-sm leading-6">
          <p>
            The upgrade takes effect immediately after payment. You pay the new
            plan monthly price, and any unused value on your current plan is
            converted into extra days on the new plan.
          </p>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <div>
              New plan price:{' '}
              <strong>${products[targetTier].price}/month</strong>
            </div>
            {preview.remainingDays > 0 && (
              <div>
                Current plan remaining time: approximately{' '}
                <strong>{preview.remainingDays} days</strong>, converted into{' '}
                <strong>{preview.transferredDays} extra days</strong> on{' '}
                {targetTitle}.
              </div>
            )}
            <div>
              Estimated new-plan access after payment:{' '}
              <strong>{preview.totalDays} days</strong>
              {preview.estimatedExpiry
                ? `, until about ${preview.estimatedExpiry}`
                : ''}
              .
            </div>
          </div>
          <p>
            No unused value is lost. The old subscription is cancelled after the
            new payment succeeds, and the higher quota is available without
            changing your app integration or release flow.
          </p>
        </div>
      ),
      onOk: async () => {
        await startPurchase(targetTier);
      },
    });
  };

  return (
    <Dropdown.Button
      className="shrink-0"
      icon={<CreditCardOutlined />}
      loading={loading}
      menu={{
        items: menuItems,
        onClick: handleMenuClick,
      }}
      onClick={handleMainButtonClick}
    >
      {loading ? 'Preparing payment...' : upgradeOptions[0]?.title || 'Upgrade'}
    </Dropdown.Button>
  );
};

function UserPanel() {
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
      label: 'Apps',
      limit: currentQuota.app,
      note: 'Total apps under this account',
      percent: Math.min(100, (appCount / currentQuota.app) * 100),
      status: appCount > currentQuota.app ? 'exception' : 'normal',
      value: `${appCount.toLocaleString()} / ${currentQuota.app.toLocaleString()}`,
    },
    {
      key: 'bundle',
      label: 'OTA bundles',
      limit: currentQuota.bundle,
      loading: isVersionCountLoading,
      note: isVersionCountLoading
        ? 'Counting OTA bundles across apps'
        : 'Highest usage in one app',
      percent: isVersionCountLoading
        ? 0
        : Math.min(100, (maxVersionCount / currentQuota.bundle) * 100),
      status: maxVersionCount > currentQuota.bundle ? 'exception' : 'normal',
      value: isVersionCountLoading
        ? 'Counting'
        : `${maxVersionCount.toLocaleString()} / ${currentQuota.bundle.toLocaleString()}`,
    },
    {
      key: 'package',
      label: 'Native packages',
      limit: currentQuota.package,
      loading: isPackageCountLoading,
      note: isPackageCountLoading
        ? 'Counting native packages across apps'
        : 'Highest usage in one app',
      percent: isPackageCountLoading
        ? 0
        : Math.min(100, (maxPackageCount / currentQuota.package) * 100),
      status: maxPackageCount > currentQuota.package ? 'exception' : 'normal',
      value: isPackageCountLoading
        ? 'Counting'
        : `${maxPackageCount.toLocaleString()} / ${currentQuota.package.toLocaleString()}`,
    },
  ];
  const quotaSizeLimits = [
    {
      label: 'Native package size',
      value: currentQuota.packageSize,
    },
    {
      label: 'OTA bundle size',
      value: currentQuota.bundleSize,
    },
    {
      label: 'Daily checks limit',
      value: `${currentQuota.pv.toLocaleString()} / day`,
    },
  ];
  const handleLogout = () => {
    message.info('You have been logged out.');
    logout();
  };

  return (
    <div className="body">
      <Descriptions
        title="Account Information"
        column={1}
        layout={isMobile ? 'vertical' : 'horizontal'}
        size={isMobile ? 'small' : undefined}
        styles={{
          content: { wordBreak: 'break-word' },
          label: isMobile ? undefined : { width: 134 },
        }}
        bordered
      >
        <Descriptions.Item label="Username">{name}</Descriptions.Item>
        <Descriptions.Item label="Email">
          <span className="break-all">{email}</span>
        </Descriptions.Item>
        <Descriptions.Item label="Subscription">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <span className="whitespace-nowrap">{currentQuota.title}</span>
              {cancelAtPeriodEnd && (
                <span
                  className="whitespace-nowrap"
                  style={{ color: '#faad14', fontSize: 12 }}
                >
                  (cancelling)
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
        </Descriptions.Item>
        <Descriptions.Item label="Next billing date">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {displayExpireDay ? (
              <div className="flex min-w-0 flex-col">
                {displayExpireDay}
                {displayRemainingDays && (
                  <>
                    <br />
                    <div>{displayRemainingDays}</div>
                  </>
                )}
              </div>
            ) : (
              'Not available'
            )}
            {tier !== 'free' && (
              <CancelResumeButton cancelAtPeriodEnd={cancelAtPeriodEnd} />
            )}
          </div>
        </Descriptions.Item>
        <Descriptions.Item label="Quota details">
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
          View pricing
        </Button>
        <Button
          danger
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          className="w-full md:w-auto"
        >
          Logout
        </Button>
      </div>
    </div>
  );
}

type QuotaUsageRow = {
  key: string;
  label: string;
  limit: number;
  loading?: boolean;
  note: string;
  percent: number;
  status: 'exception' | 'normal';
  value: string;
};

function QuotaDetailsPanel({
  dailyQuota,
  last7dAvg,
  last7dCounts,
  remainingChecks,
  rows,
  sizeLimits,
}: {
  dailyQuota: number;
  last7dAvg?: number;
  last7dCounts?: number[];
  remainingChecks?: number;
  rows: QuotaUsageRow[];
  sizeLimits: Array<{ label: string; value: string }>;
}) {
  const remainingPercent =
    typeof remainingChecks === 'number'
      ? Math.max(0, Math.min(100, (remainingChecks / dailyQuota) * 100))
      : 0;
  const status =
    remainingChecks !== undefined && remainingChecks <= 0
      ? 'exception'
      : 'normal';

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid items-stretch gap-4 border-slate-100 border-b bg-gradient-to-br from-slate-50 to-white p-4 lg:grid-cols-2">
        <div className="flex min-h-[150px] flex-col">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-medium text-slate-900">Daily checks</div>
              <div className="mt-0.5 text-slate-500 text-xs">
                Used when clients check for OTA updates, shared by all apps.
              </div>
            </div>
            {status === 'exception' && <Tag color="red">Over limit</Tag>}
          </div>
          <div className="mt-4">
            <div>
              <div className="text-[11px] text-gray-500">Remaining today</div>
              <div className="mt-1 font-semibold text-2xl leading-none tabular-nums">
                {remainingChecks === undefined
                  ? dailyQuota.toLocaleString()
                  : Math.max(0, remainingChecks).toLocaleString()}
              </div>
              <div className="mt-1 text-gray-500 text-xs">
                Limit {dailyQuota.toLocaleString()} / day
              </div>
            </div>
          </div>
          <div className="mt-5">
            <Progress
              className="mb-0"
              percent={remainingPercent}
              showInfo={false}
              size="small"
              status={status}
            />
          </div>
        </div>
        <MiniQuotaBars
          dailyQuota={dailyQuota}
          title={`7-day average remaining ${formatOptionalNumber(last7dAvg)} (${formatQuotaDateRangeLabel()})`}
          tooltipSuffix="checks"
          values={last7dCounts}
        />
      </div>

      <div className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div
            className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(140px,0.9fr)_minmax(180px,1fr)_minmax(180px,1.2fr)] md:items-center"
            key={row.key}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">{row.label}</span>
                {row.status === 'exception' && (
                  <Tag color="red">Over limit</Tag>
                )}
              </div>
              <div className="mt-0.5 text-slate-500 text-xs">{row.note}</div>
            </div>
            <div className="font-semibold tabular-nums">{row.value}</div>
            <Progress
              percent={row.percent}
              showInfo={false}
              size="small"
              status={row.status}
            />
          </div>
        ))}
      </div>

      <div className="border-slate-100 border-t bg-slate-50/70 px-4 py-3">
        <div className="mb-2 font-medium text-slate-700 text-xs">Limits</div>
        <div className="grid gap-2 sm:grid-cols-3">
          {sizeLimits.map((item) => (
            <div key={item.label}>
              <div className="text-[11px] text-slate-500">{item.label}</div>
              <div className="mt-0.5 font-medium">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniQuotaBars({
  dailyQuota,
  title,
  tooltipSuffix,
  values,
}: {
  dailyQuota: number;
  title: string;
  tooltipSuffix: string;
  values?: number[];
}) {
  const bars = (values ?? [])
    .slice(0, 7)
    .reverse()
    .map((value, index, array) => {
      const daysAgo = array.length - index - 1;
      return {
        daysAgo,
        dateLabel: formatQuotaDateLabel(daysAgo),
        value,
      };
    });

  return (
    <div className="flex h-full min-h-[150px] flex-col rounded-lg border border-slate-200/70 bg-white/70 p-3">
      <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
        <span>{title}</span>
      </div>
      {bars.length > 0 ? (
        <div className="mt-2 flex flex-1 items-end gap-1.5">
          {bars.map((bar) => {
            const percent =
              dailyQuota > 0
                ? Math.max(
                    bar.value > 0 ? 4 : 0,
                    Math.min(100, (Math.max(0, bar.value) / dailyQuota) * 100),
                  )
                : 0;
            return (
              <div
                className="flex h-full min-w-0 flex-1 flex-col items-center"
                key={`${bar.daysAgo}-days-ago`}
              >
                <div className="flex min-h-0 w-full flex-1 items-end rounded bg-slate-100">
                  <Tooltip
                    title={`${bar.dateLabel}: ${bar.value.toLocaleString()} ${tooltipSuffix}`}
                  >
                    <div
                      className="w-full rounded bg-blue-500 transition-colors hover:bg-blue-600"
                      style={{ height: `${percent}%` }}
                    />
                  </Tooltip>
                </div>
                <span className="mt-1 text-[10px] text-gray-400 tabular-nums">
                  {bar.dateLabel}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-2 flex flex-1 items-center justify-center rounded bg-white text-gray-400 text-xs">
          No 7-day details yet
        </div>
      )}
    </div>
  );
}

function formatOptionalNumber(value?: number) {
  return typeof value === 'number' ? Math.max(0, value).toLocaleString() : '-';
}

function formatQuotaDateLabel(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return formatShortQuotaDate(date);
}

function formatQuotaDateRangeLabel() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return `${formatShortQuotaDate(start)} - ${formatShortQuotaDate(end)}`;
}

function formatShortQuotaDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

async function purchase(tier?: string) {
  const orderResponse = await api.createOrder({ tier });
  if (orderResponse?.payUrl) {
    window.location.href = orderResponse.payUrl;
  }
}

function calculateUpgradePreview({
  currentTier,
  targetTier,
  tierExpiresAt,
}: {
  currentTier: Tier;
  targetTier: keyof typeof products;
  tierExpiresAt?: string;
}) {
  const currentProduct = products[currentTier as keyof typeof products];
  const targetProduct = products[targetTier];
  const now = dayjs();
  let remainingDays = 0;
  let transferredDays = 0;

  if (currentProduct && currentTier !== 'free' && tierExpiresAt) {
    const expiresAt = dayjs(tierExpiresAt);
    if (now.isBefore(expiresAt)) {
      remainingDays = expiresAt.diff(now, 'day');
      const remainingValue = (remainingDays / 30) * currentProduct.price;
      const targetDailyRate = targetProduct.price / 30;
      transferredDays = Math.floor(remainingValue / targetDailyRate);
    }
  }

  const totalDays = 30 + transferredDays;

  return {
    remainingDays,
    transferredDays,
    totalDays,
    estimatedExpiry: now.add(totalDays, 'day').format('YYYY-MM-DD'),
  };
}

export const Component = UserPanel;
