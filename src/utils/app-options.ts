import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { appKeys } from '@/utils/query-keys';

export interface AppOption {
  label: string;
  value: number;
}

/**
 * App select options plus an id -> name map. The API key, MCP connection and
 * members pages all pick apps in a modal and translate appIds into names in
 * their tables, so they share the same appList cache here.
 * `enabled` is left to the caller: only fetch when the modal is open or the
 * user can manage members.
 */
export function useAppOptions({ enabled = true }: { enabled?: boolean } = {}) {
  const { data } = useQuery({
    queryKey: appKeys.list(),
    queryFn: api.appList,
    enabled,
  });
  const appOptions: AppOption[] = (data?.data ?? []).map((app) => ({
    label: app.name,
    value: app.id,
  }));
  const appNameById = new Map(appOptions.map((o) => [o.value, o.label]));
  return { appOptions, appNameById };
}
