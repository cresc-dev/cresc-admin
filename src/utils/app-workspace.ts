import { useAppList, useUserInfo } from '@/utils/hooks';

// Shared app-selection data: the manage page drawer, the top app switcher and
// the metrics pages all take the app list from here

export interface AppDrawerItem {
  id: number;
  name: string;
  platform: 'android' | 'ios' | 'harmony';
  status?: string | null;
  appKey?: string | null;
  checkCount?: number;
  downloadUrl?: string | null;
}

export function useAppWorkspaceList(): {
  apps: AppDrawerItem[];
  isAdmin: boolean;
  isLoading: boolean;
  totalAppCount: number;
} {
  const { apps: userApps, isLoading: isLoadingUserApps } = useAppList();
  const { user } = useUserInfo();
  const isAdmin = user?.admin === true;

  const apps: AppDrawerItem[] = userApps ?? [];
  return {
    apps,
    isAdmin,
    isLoading: isLoadingUserApps,
    totalAppCount: apps.length,
  };
}
