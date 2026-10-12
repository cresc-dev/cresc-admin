import { useSyncExternalStore } from 'react';
import { safeStorage } from '@/utils/storage';

// Snapshots must be primitives: useSyncExternalStore compares them with Object.is
type PreferenceValue = string | number | boolean | null;

export type StoredPreference<T extends PreferenceValue> = {
  get: () => T;
  set: (value: T) => void;
  subscribe: (onChange: () => void) => () => void;
};

/**
 * A UI preference kept in localStorage and shared by several components
 * (drawer placement, custom API base URL, ...).
 * - Same page: set dispatches changeEvent and every subscriber re-renders;
 * - Other tabs: the storage event is observed;
 * - Storage not writable (site data blocked, ...): falls back to memory, so it
 *   still applies for this page session.
 */
export function createStoredPreference<T extends PreferenceValue>({
  changeEvent,
  key,
  parse,
  serialize,
}: {
  changeEvent: string;
  key: string;
  /** Parses the stored raw value into the preference; null when never stored. */
  parse: (raw: string | null) => T;
  /** Returning null removes the key (back to the default). */
  serialize: (value: T) => string | null;
}): StoredPreference<T> {
  // In-memory fallback when a storage write failed; undefined means storage wins
  let fallback: string | null | undefined;

  const get = () => {
    if (typeof window === 'undefined') {
      return parse(null);
    }
    return parse(fallback !== undefined ? fallback : safeStorage.get(key));
  };

  const set = (value: T) => {
    if (typeof window === 'undefined') {
      return;
    }
    const raw = serialize(value);
    const saved =
      raw === null ? safeStorage.remove(key) : safeStorage.set(key, raw);
    fallback = saved ? undefined : raw;
    window.dispatchEvent(new CustomEvent(changeEvent, { detail: value }));
  };

  const subscribe = (onChange: () => void) => {
    const onStorage = (event: StorageEvent) => {
      // A null key means another tab cleared the whole storage
      if (event.key === null || event.key === key) {
        onChange();
      }
    };
    window.addEventListener(changeEvent, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(changeEvent, onChange);
      window.removeEventListener('storage', onStorage);
    };
  };

  return { get, set, subscribe };
}

/** Subscribes to a StoredPreference; re-renders when it changes (this page or another tab). */
export function useStoredPreference<T extends PreferenceValue>(
  preference: StoredPreference<T>,
): T {
  return useSyncExternalStore(
    preference.subscribe,
    preference.get,
    preference.get,
  );
}
