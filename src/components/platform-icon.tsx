import {
  AndroidFilled,
  AppleFilled,
  HarmonyOSOutlined,
} from '@ant-design/icons';
import { cn } from '@/utils/helper';

export const PLATFORM_LABELS: Record<App['platform'], string> = {
  ios: 'iOS',
  android: 'Android',
  harmony: 'HarmonyOS',
};

/** Platform options for table filters and selects, in PLATFORM_LABELS order. */
export const PLATFORM_OPTIONS = Object.entries(PLATFORM_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export default function PlatformIcon({
  platform,
  className,
}: {
  platform?: 'android' | 'ios' | 'harmony';
  className?: string;
}) {
  if (!platform) {
    return null;
  }
  if (platform === 'android') {
    return <AndroidFilled className={cn('text-[#3ddc84]!', className)} />;
  }
  if (platform === 'ios') {
    return <AppleFilled className={cn('text-[#a6b1b7]!', className)} />;
  }
  return <HarmonyOSOutlined className={cn('text-[#a6b1b7]!', className)} />;
}
