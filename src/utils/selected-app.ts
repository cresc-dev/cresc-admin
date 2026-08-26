import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  type AppDrawerItem,
  useAppWorkspaceList,
} from '@/components/app-drawer';
import { patchSearchParams, rememberRecentApp } from '@/utils/helper';

/**
 * App selection driven by the ?appKey in the URL, shared by the metrics and
 * health pages. Admins may look at any appKey (to debug someone else's app);
 * regular users only get apps from their own list. Arriving without an appKey
 * selects the first app and writes it back to the URL, so refreshes and
 * shared links stay stable.
 */
export const useSelectedAppFromUrl = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    apps: selectableApps,
    isAdmin,
    isLoading: isLoadingApps,
  } = useAppWorkspaceList();
  const urlAppKey = searchParams.get('appKey') || undefined;
  const selectableAppKeys = selectableApps
    .map((app) => app.appKey)
    .filter((appKey): appKey is string => Boolean(appKey));
  const selectedAppKey =
    urlAppKey && (isAdmin || selectableAppKeys.includes(urlAppKey))
      ? urlAppKey
      : undefined;
  const selectedApp = selectedAppKey
    ? selectableApps.find((app) => app.appKey === selectedAppKey)
    : undefined;

  const firstAppKey = selectableAppKeys[0];
  useEffect(() => {
    if (!urlAppKey && firstAppKey) {
      patchSearchParams(setSearchParams, { appKey: firstAppKey });
    }
  }, [firstAppKey, setSearchParams, urlAppKey]);

  const selectApp = (app: AppDrawerItem) => {
    if (!app.appKey) {
      return;
    }
    rememberRecentApp(app.id);
    patchSearchParams(setSearchParams, { appKey: app.appKey });
  };

  return {
    selectableApps,
    isAdmin,
    isLoadingApps,
    selectedAppKey,
    selectedApp,
    selectApp,
  };
};
