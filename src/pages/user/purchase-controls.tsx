import { CreditCardOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Button, Dropdown, Modal, message, Popconfirm } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { products, quotas } from '../../constants/quotas';
import { calculateUpgradePreview, purchase } from './billing';

export const CancelResumeButton = ({
  cancelAtPeriodEnd,
}: {
  cancelAtPeriodEnd: boolean;
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  if (cancelAtPeriodEnd) {
    return (
      <Popconfirm
        title={t('user.resume_title')}
        description={t('user.resume_desc')}
        onConfirm={async () => {
          setLoading(true);
          try {
            await api.resumeSubscription();
            message.success(t('user.resume_success'));
          } catch {
            message.error(t('user.resume_failed'));
          } finally {
            setLoading(false);
          }
        }}
        okText={t('user.resume_ok')}
        cancelText={t('user.no')}
      >
        <Button
          type="link"
          loading={loading}
          className="mt-2 self-start px-0 md:mt-0"
        >
          {t('user.resume_button')}
        </Button>
      </Popconfirm>
    );
  }

  return (
    <Popconfirm
      title={t('user.cancel_title')}
      description={t('user.cancel_desc')}
      onConfirm={async () => {
        setLoading(true);
        try {
          await api.cancelSubscription();
          message.success(t('user.cancel_success'));
        } catch {
          message.error(t('user.cancel_failed'));
        } finally {
          setLoading(false);
        }
      }}
      okText={t('user.cancel_ok')}
      okButtonProps={{ danger: true }}
      cancelText="No"
    >
      <Button
        type="link"
        danger
        loading={loading}
        className="mt-2 self-start px-0 md:mt-0"
      >
        {t('user.cancel_button')}
      </Button>
    </Popconfirm>
  );
};

export const UpgradeDropdown = ({
  currentQuota,
  currentTier,
  tierExpiresAt,
}: {
  currentQuota: (typeof quotas)[keyof typeof quotas];
  currentTier: Tier;
  tierExpiresAt?: string;
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  // Get all upgradeable tiers
  const getUpgradeOptions = () => {
    const allTiers = [
      {
        key: 'standard',
        title: t('user.upgrade_to', { tier: 'Standard' }),
        tier: 'standard',
      },
      {
        key: 'premium',
        title: t('user.upgrade_to', { tier: 'Premium' }),
        tier: 'premium',
      },
      { key: 'pro', title: t('user.upgrade_to', { tier: 'Pro' }), tier: 'pro' },
      { key: 'max', title: t('user.upgrade_to', { tier: 'Max' }), tier: 'max' },
      {
        key: 'ultra',
        title: t('user.upgrade_to', { tier: 'Ultra' }),
        tier: 'ultra',
      },
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
      title: t('user.upgrade_confirm_title', { tier: targetTitle }),
      width: 620,
      okText: t('user.upgrade_ok'),
      cancelText: t('user.cancel'),
      content: (
        <div className="space-y-3 text-sm leading-6">
          <p>{t('user.upgrade_desc')}</p>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <div>
              {t('user.new_plan_price')}{' '}
              <strong>
                {t('user.price_month', { price: products[targetTier].price })}
              </strong>
            </div>
            {preview.remainingDays > 0 && (
              <div>
                {t('user.current_remaining')}{' '}
                <strong>
                  {t('user.remaining_days', { days: preview.remainingDays })}
                </strong>
                , {t('user.converted_into')}{' '}
                <strong>
                  {t('user.extra_days', { days: preview.transferredDays })}
                </strong>{' '}
                on {targetTitle}.
              </div>
            )}
            <div>
              {t('user.estimated_access')}{' '}
              <strong>
                {t('user.total_days', { days: preview.totalDays })}
              </strong>
              {preview.estimatedExpiry
                ? `, ${t('user.until_about', { date: preview.estimatedExpiry })}`
                : ''}
              .
            </div>
          </div>
          <p>{t('user.upgrade_no_loss')}</p>
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
      {loading
        ? t('user.preparing_payment')
        : upgradeOptions[0]?.title || t('user.upgrade_button')}
    </Dropdown.Button>
  );
};
