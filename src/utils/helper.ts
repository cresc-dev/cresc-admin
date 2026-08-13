import type { NavigateOptions, SetURLSearchParams } from 'react-router-dom';

export function isPasswordValid(password: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,16}$/.test(password);
}

export function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export const ping = async (url: string, signal?: AbortSignal) => {
  let pingFinished = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await (Promise.race([
      fetch(url, {
        method: 'HEAD',
        signal,
      })
        .then(({ status, statusText }) => {
          pingFinished = true;
          if (status === 200) {
            console.log('ping success', url);
            return url;
          }
          console.log('ping failed', url, status, statusText);
          throw Error('ping failed');
        })
        .catch((e) => {
          pingFinished = true;
          if (!signal?.aborted) {
            console.log('ping error', url, e);
          }
          throw Error('ping error');
        }),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(Error('ping timeout'));
          if (!pingFinished) {
            console.log('ping timeout', url);
          }
        }, 2000);
      }),
    ]) as Promise<string | null>);
  } finally {
    clearTimeout(timer);
  }
};

const HEDGE_DELAY_MS = 250;

// Hedged race instead of pinging every endpoint at once: the preferred (first)
// url is tried immediately, each following one only after HEDGE_DELAY_MS of
// silence (or immediately when a previous ping failed). The first success wins
// and the losing pings are aborted. Falls back to urls[0] when all fail.
export const testUrls = async (
  urls?: string[],
  hedgeDelayMs: number = HEDGE_DELAY_MS,
) => {
  if (!urls?.length) {
    return null;
  }
  return new Promise<string>((resolve) => {
    const controllers: AbortController[] = [];
    let nextIndex = 0;
    let pending = 0;
    let settled = false;
    let hedgeTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (
      winner: string | null,
      winnerController?: AbortController,
    ) => {
      if (settled) {
        return;
      }
      settled = true;
      if (hedgeTimer) {
        clearTimeout(hedgeTimer);
      }
      for (const controller of controllers) {
        if (controller !== winnerController) {
          controller.abort();
        }
      }
      if (winner == null) {
        console.log('all ping failed, use first url:', urls[0]);
      }
      resolve(winner ?? urls[0]);
    };

    const launchNext = () => {
      if (hedgeTimer) {
        clearTimeout(hedgeTimer);
        hedgeTimer = undefined;
      }
      if (settled || nextIndex >= urls.length) {
        return;
      }
      const url = urls[nextIndex++];
      const controller = new AbortController();
      controllers.push(controller);
      pending++;
      ping(url, controller.signal).then(
        () => finish(url, controller),
        () => {
          pending--;
          if (settled) {
            return;
          }
          if (nextIndex < urls.length) {
            // A failure frees its slot: hedge the next url right away.
            launchNext();
          } else if (pending === 0) {
            finish(null);
          }
        },
      );
      if (!settled && nextIndex < urls.length) {
        hedgeTimer = setTimeout(launchNext, hedgeDelayMs);
      }
    };

    launchNext();
  });
};

export const patchSearchParams = (
  setSearchParams: SetURLSearchParams,
  patch: Record<string, string | null | undefined>,
  navigateOptions: NavigateOptions = { replace: true },
) => {
  setSearchParams((prev) => {
    const next = new URLSearchParams(prev);

    for (const [key, value] of Object.entries(patch)) {
      if (value == null) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }

    return next;
  }, navigateOptions);
};

const RECENT_APP_STORAGE_KEY = 'cresc_recent_app_ids';
const MAX_RECENT_APP_COUNT = 6;
const MANAGE_APP_DRAWER_PLACEMENT_STORAGE_KEY =
  'cresc_manage_app_drawer_placement';
const MANAGE_APP_DRAWER_COLLAPSED_STORAGE_KEY =
  'cresc_manage_app_drawer_collapsed';

export type ManageAppDrawerPlacement = 'left' | 'right' | 'hidden';

export const manageAppDrawerPlacementChangeEvent =
  'manage-app-drawer-placement-change';
export const manageAppDrawerCollapsedChangeEvent =
  'manage-app-drawer-collapsed-change';

export const getManageAppDrawerPlacement = (): ManageAppDrawerPlacement => {
  if (typeof window === 'undefined') {
    return 'left';
  }

  const stored = window.localStorage.getItem(
    MANAGE_APP_DRAWER_PLACEMENT_STORAGE_KEY,
  );
  if (stored === 'right' || stored === 'hidden') {
    return stored;
  }
  return 'left';
};

export const setManageAppDrawerPlacement = (
  placement: ManageAppDrawerPlacement,
) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    MANAGE_APP_DRAWER_PLACEMENT_STORAGE_KEY,
    placement,
  );
  window.dispatchEvent(
    new CustomEvent(manageAppDrawerPlacementChangeEvent, {
      detail: placement,
    }),
  );
};

export const getManageAppDrawerCollapsed = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const stored = window.localStorage.getItem(
    MANAGE_APP_DRAWER_COLLAPSED_STORAGE_KEY,
  );
  if (stored === '1') {
    return true;
  }
  if (stored === '0') {
    return false;
  }
  return false;
};

export const setManageAppDrawerCollapsed = (collapsed: boolean) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    MANAGE_APP_DRAWER_COLLAPSED_STORAGE_KEY,
    collapsed ? '1' : '0',
  );
  window.dispatchEvent(
    new CustomEvent(manageAppDrawerCollapsedChangeEvent, {
      detail: collapsed,
    }),
  );
};

export const getRecentAppIds = () => {
  if (typeof window === 'undefined') {
    return [] as number[];
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(RECENT_APP_STORAGE_KEY) ?? '[]',
    );
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((value): value is number => Number.isInteger(value));
  } catch {
    return [];
  }
};

export const rememberRecentApp = (appId: number) => {
  if (typeof window === 'undefined' || !Number.isInteger(appId)) {
    return [] as number[];
  }

  const next = [appId, ...getRecentAppIds().filter((id) => id !== appId)].slice(
    0,
    MAX_RECENT_APP_COUNT,
  );
  window.localStorage.setItem(RECENT_APP_STORAGE_KEY, JSON.stringify(next));
  return next;
};

// ---- Binding dependency checks (the server is authoritative; this
// pre-check fails early with readable reasons) ----

/** Tolerates range prefixes (^ ~ >=); takes the first x.y.z; null on failure. */
export function parseDepVersion(raw?: string): [number, number, number] | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const matched = raw.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!matched) {
    return null;
  }
  return [Number(matched[1]), Number(matched[2]), Number(matched[3])];
}

export function compareDepVersions(
  a: [number, number, number],
  b: [number, number, number],
) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) {
      return a[i] - b[i];
    }
  }
  return 0;
}

/**
 * Hard binding rules (mirrors the server's bindingDeps): a react-native
 * version mismatch or a react-native-update downgrade blocks binding.
 * Missing/unparseable deps never block (legacy data; server behaves the same).
 */
export function getFatalDepsViolation(
  packageDeps: Record<string, string> | undefined,
  versionDeps: Record<string, string> | undefined,
): 'rn_mismatch' | 'rnu_downgrade' | null {
  const pkgRn = parseDepVersion(packageDeps?.['react-native']);
  const verRn = parseDepVersion(versionDeps?.['react-native']);
  if (pkgRn && verRn && compareDepVersions(pkgRn, verRn) !== 0) {
    return 'rn_mismatch';
  }
  const pkgRnu = parseDepVersion(packageDeps?.['react-native-update']);
  const verRnu = parseDepVersion(versionDeps?.['react-native-update']);
  if (pkgRnu && verRnu && compareDepVersions(verRnu, pkgRnu) < 0) {
    return 'rnu_downgrade';
  }
  return null;
}

/**
 * forceBoot only means something to packages where the native cold-start
 * check (its consumer) actually works: Android/iOS since 10.51.0; harmony
 * only since 10.52.1 — a TurboModule bridging bug kept the check dark there
 * in 10.51.0-10.52.0. Below the floor or unknown, hide the entry.
 */
export function packageSupportsForceBoot(
  packageDeps?: Record<string, string>,
  platform?: 'ios' | 'android' | 'harmony',
): boolean {
  const rnu = parseDepVersion(packageDeps?.['react-native-update']);
  if (!rnu) {
    return false;
  }
  const floor: [number, number, number] =
    platform === 'harmony' ? [10, 52, 1] : [10, 51, 0];
  return compareDepVersions(rnu, floor) >= 0;
}
