import { CreditCardOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import {
  Button,
  Descriptions,
  Dropdown,
  Grid,
  message,
  Modal,
  Popconfirm,
  Spin,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { api } from '@/services/api';
import { useUserInfo } from '@/utils/hooks';
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

  const confirmUpgrade = (targetTier: keyof typeof products) => {
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
        setLoading(true);
        try {
          await purchase(targetTier);
        } catch {
          setLoading(false);
        }
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
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
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
  const quotaDetails = [
    { key: 'app', item: 'Apps', value: `${currentQuota.app}` },
    {
      key: 'package',
      item: 'Native packages / app',
      value: `${currentQuota.package}`,
    },
    {
      key: 'packageSize',
      item: 'Native package size',
      value: currentQuota.packageSize,
    },
    {
      key: 'bundle',
      item: 'OTA bundles / app',
      value: `${currentQuota.bundle}`,
    },
    {
      key: 'bundleSize',
      item: 'OTA bundle size',
      value: currentQuota.bundleSize,
    },
    {
      key: 'pv',
      item: 'Daily checks',
      value: currentQuota.pv.toLocaleString(),
    },
  ];

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
                <span className="whitespace-nowrap" style={{ color: '#faad14', fontSize: 12 }}>
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
          <div className="grid gap-2 sm:grid-cols-2">
            {quotaDetails.map(({ key, item, value }) => (
              <div
                key={key}
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="text-xs text-gray-500">{item}</div>
                <div className="mt-1 font-medium">{value}</div>
              </div>
            ))}
          </div>
        </Descriptions.Item>
      </Descriptions>
      <br />
      <Button href={PRICING_LINK} target="_blank" className="w-full md:w-auto">
        View pricing
      </Button>
    </div>
  );
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
