import { manageAppDrawerPlacementPreference } from '@/utils/app-preferences';
import { useStoredPreference } from '@/utils/stored-preference';

/**
 * Track the manage-page app drawer placement, staying in sync with changes
 * made in other components (via the custom event) and other tabs (via the
 * storage event). The setter writes to storage and notifies all subscribers.
 */
export function useManageAppDrawerPlacement() {
  const placement = useStoredPreference(manageAppDrawerPlacementPreference);
  return [placement, manageAppDrawerPlacementPreference.set] as const;
}
