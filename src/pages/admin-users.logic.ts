import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { quotas } from '@/constants/quotas';

/** Pure logic for the admin users page: table URL config, status display, quota JSON parsing and expiry shortcuts */

export const tierOptions = [
  { value: 'free', label: 'Free' },
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'pro', label: 'Pro' },
  { value: 'max', label: 'Max' },
  { value: 'ultra', label: 'Ultra' },
  { value: 'custom', label: 'Custom' },
];

export const tierLabelMap = new Map(
  tierOptions.map((option) => [option.value, option.label]),
);

export const SORTABLE_COLUMNS = new Set([
  'id',
  'email',
  'name',
  'createdAt',
  'tier',
  'status',
  'tierExpiresAt',
]);

// Single-select header filters, mirrored straight into same-named URL params
export const FILTER_KEYS = ['status', 'tier'] as const;

export const statusMeta = (
  status: string | null | undefined,
  t: (key: string) => string,
) => {
  if (status === 'unverified') {
    return {
      badge: 'warning' as const,
      cls: 'text-orange-500',
      label: t('admin_users.status_unverified'),
    };
  }
  if (status === 'dormant') {
    return {
      badge: 'default' as const,
      cls: 'text-gray-400',
      label: t('admin_users.status_dormant'),
    };
  }
  return {
    badge: 'success' as const,
    cls: 'text-green-600',
    label: t('admin_users.status_normal'),
  };
};

export const defaultPremiumQuotaText = JSON.stringify(quotas.premium, null, 2);
export const expiryShortcutDays = [7, 30, 365] as const;

// A custom tier without a quota starts from the premium template instead of a blank editor
export const getInitialQuotaValue = (record: AdminUser) => {
  if (record.quota) {
    return JSON.stringify(record.quota, null, 2);
  }

  return record.tier === 'custom' ? defaultPremiumQuotaText : '';
};

/**
 * Quota text from the editor -> value to submit. Blank clears the custom
 * quota (null); invalid JSON returns null so the caller can warn instead of
 * sending a half-formed quota.
 */
export const parseQuotaInput = (
  value: string,
): { quota: Quota | null } | null => {
  if (!value.trim()) {
    return { quota: null };
  }
  try {
    return { quota: JSON.parse(value) as Quota };
  } catch {
    return null;
  }
};

/** Extend from the existing valid expiry when there is one, otherwise from now */
export const getExtendedTierExpiry = (
  currentValue: Dayjs | string | null | undefined,
  days: number,
): Dayjs => {
  const currentExpiry = currentValue ? dayjs(currentValue) : null;
  const baseDate = currentExpiry?.isValid() ? currentExpiry : dayjs();

  return baseDate.add(days, 'day');
};
