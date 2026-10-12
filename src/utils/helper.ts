import type { NavigateOptions, SetURLSearchParams } from 'react-router-dom';

export function isPasswordValid(password: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,16}$/.test(password);
}

export function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

const ping = async (url: string, signal?: AbortSignal) => {
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
      resolve(winner ?? urls[0] ?? '');
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
      if (url === undefined) {
        return;
      }
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

function compareDepVersions(
  a: [number, number, number],
  b: [number, number, number],
) {
  for (let i = 0; i < 3; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av !== bv) {
      return av - bv;
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
 * forceBoot is only shown for packages shipping react-native-update
 * >= 10.52.1 — the uniform floor where the full rescue capability exists
 * (crash-moment rescue + resumable downloads, and the harmony bridging fix
 * that made the native check actually work there). Below or unknown, hide
 * the entry.
 */
export function packageSupportsForceBoot(
  packageDeps?: Record<string, string>,
): boolean {
  const rnu = parseDepVersion(packageDeps?.['react-native-update']);
  return !!rnu && compareDepVersions(rnu, [10, 52, 1]) >= 0;
}

/** Keyword filter for app lists: a hit on name, appKey or platform is enough (shared by the drawer and the apps page). */
export const filterAppsByQuery = <
  T extends {
    name?: string | null;
    appKey?: string | null;
    platform?: string | null;
  },
>(
  apps: T[],
  query: string,
): T[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return apps;
  }
  return apps.filter((app) =>
    [app.name, app.appKey, app.platform]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalizedQuery)),
  );
};
