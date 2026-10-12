/**
 * localStorage throws outright in Safari private mode, when site data is
 * blocked, or when the quota is exhausted. Every persisted preference goes
 * through here: an unreadable value counts as never stored, a failed write is
 * silently dropped, and the page renders as usual either way.
 */
const createSafeStorage = (
  pick: (win: Window & typeof globalThis) => Storage,
) => {
  const getStorage = (): Storage | null => {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return pick(window);
    } catch {
      return null;
    }
  };

  return {
    get(key: string): string | null {
      try {
        return getStorage()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    set(key: string, value: string): boolean {
      try {
        const storage = getStorage();
        if (!storage) return false;
        storage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
    remove(key: string): boolean {
      try {
        const storage = getStorage();
        if (!storage) return false;
        storage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
  };
};

export const safeStorage = createSafeStorage((win) => win.localStorage);

/** sessionStorage, scoped to the current tab, with the same fault tolerance as safeStorage. */
export const safeSessionStorage = createSafeStorage(
  (win) => win.sessionStorage,
);
