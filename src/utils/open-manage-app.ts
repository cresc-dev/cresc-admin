import { rootRouterPath, router } from '@/router';
import { rememberRecentApp } from '@/utils/app-preferences';

/** Opens an app's manage page and records it as recent (the app switcher sorts by it). */
export const openManageApp = (appId: number) => {
  rememberRecentApp(appId);
  return router.navigate(rootRouterPath.versions(String(appId)));
};
