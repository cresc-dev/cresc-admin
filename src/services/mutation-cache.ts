/** Cache shape of list endpoints: { data: list, ...other fields (e.g. count) }. */
export type ListCache<T> = { data?: T[] };

export type AppListCache = ListCache<App>;

type ListItem<C extends ListCache<{ id: number }>> = NonNullable<
  C['data']
>[number];

// These updaters only touch existing caches: a list that was never loaded
// stays undefined instead of a synthesized partial one.

/** Merges an update into the list item with this id; other items and cache fields stay as they are. */
export const updateItemInList = <C extends ListCache<{ id: number }>>(
  old: C | undefined,
  id: number,
  params: Partial<ListItem<C>>,
): C | undefined =>
  old
    ? {
        ...old,
        data: old.data?.map((item) =>
          item.id === id ? { ...item, ...params } : item,
        ),
      }
    : old;

/** Removes the items with the given ids from the list. */
export const removeItemsFromList = <C extends ListCache<{ id: number }>>(
  old: C | undefined,
  ids: Iterable<number>,
): C | undefined => {
  if (!old) {
    return old;
  }
  const idSet = new Set(ids);
  return { ...old, data: old.data?.filter((item) => !idSet.has(item.id)) };
};

/** Apply an update only to an existing detail cache entry. */
export const updateAppDetailCache = (
  old: App | undefined,
  params: Partial<App>,
): App | undefined => (old ? { ...old, ...params } : old);
