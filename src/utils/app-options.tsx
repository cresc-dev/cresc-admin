import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import PlatformIcon from '@/components/platform-icon';
import { api } from '@/services/api';
import { appKeys } from '@/utils/query-keys';

export interface AppOption {
  label: ReactNode;
  value: number;
  /** Plain-text name for Select search (showSearch.optionFilterProp) */
  name: string;
}

const platformLabels: Record<App['platform'], string> = {
  android: 'Android',
  ios: 'iOS',
  harmony: 'HarmonyOS',
};

/** Search apps by name (the label holds an icon, so it is not plain text) */
export const APP_OPTION_SEARCH = { optionFilterProp: 'name' };

/**
 * App select options plus an id -> name map. The API key, MCP connection and
 * members pages all pick apps in a modal and translate appIds into names in
 * their tables, so they share the same appList cache here.
 * Apps on different platforms often share a name, so each option shows the
 * platform icon and name to tell them apart.
 * `enabled` is left to the caller: only fetch when the modal is open or the
 * user can manage members.
 */
export function useAppOptions({ enabled = true }: { enabled?: boolean } = {}) {
  const { data } = useQuery({
    queryKey: appKeys.list(),
    queryFn: api.appList,
    enabled,
  });
  const apps = data?.data ?? [];
  const appOptions: AppOption[] = apps.map((app) => ({
    label: (
      <span className="inline-flex items-center gap-1">
        <PlatformIcon platform={app.platform} />
        <span>{app.name}</span>
        <span className="text-xs text-gray-400">
          {platformLabels[app.platform]}
        </span>
      </span>
    ),
    value: app.id,
    name: app.name,
  }));
  const appNameById = new Map(
    apps.map((app) => [
      app.id,
      `${app.name} (${platformLabels[app.platform]})`,
    ]),
  );
  return { appOptions, appNameById };
}
