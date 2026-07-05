import dayjs from 'dayjs';
import { api } from '@/services/api';
import { products } from '../../constants/quotas';

export async function purchase(tier?: string) {
  const orderResponse = await api.createOrder({ tier });
  if (orderResponse?.payUrl) {
    window.location.href = orderResponse.payUrl;
  }
}

export function calculateUpgradePreview({
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
