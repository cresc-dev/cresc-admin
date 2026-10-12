import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { act, cleanup, renderHook } from '@testing-library/react';
import {
  createStoredPreference,
  useStoredPreference,
} from './stored-preference';

const KEY = 'stored_preference_test';

const createModePreference = () =>
  createStoredPreference<'a' | 'b'>({
    changeEvent: 'stored-preference-test-change',
    key: KEY,
    parse: (raw) => (raw === 'b' ? 'b' : 'a'),
    serialize: (value) => (value === 'a' ? null : value),
  });

// Bun's own CustomEvent is not a happy-dom Event; happy-dom's window rejects dispatching it
const originalCustomEvent = globalThis.CustomEvent;
beforeEach(() => {
  globalThis.CustomEvent = (window as unknown as typeof globalThis).CustomEvent;
});

afterEach(() => {
  globalThis.CustomEvent = originalCustomEvent;
  cleanup();
  localStorage.removeItem(KEY);
});

describe('createStoredPreference', () => {
  test('reads and writes storage; parse decides the default', () => {
    const preference = createModePreference();
    expect(preference.get()).toBe('a');

    preference.set('b');
    expect(localStorage.getItem(KEY)).toBe('b');
    expect(preference.get()).toBe('b');

    // serialize returning null removes the key
    preference.set('a');
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  test('set notifies same-page subscribers; storage events only count for its own key', () => {
    const preference = createModePreference();
    const onChange = mock(() => {});
    const unsubscribe = preference.subscribe(onChange);

    preference.set('b');
    expect(onChange).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new StorageEvent('storage', { key: 'other' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
    preference.set('a');
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  test('falls back to memory when storage cannot be written', () => {
    const preference = createModePreference();
    const originalWindow = globalThis.window;
    // Simulate blocked site data: reads return nothing, writes throw
    (globalThis as { window: unknown }).window = {
      dispatchEvent: () => true,
      localStorage: {
        getItem: () => null,
        removeItem: () => {
          throw new Error('SecurityError');
        },
        setItem: () => {
          throw new Error('SecurityError');
        },
      },
    };
    try {
      preference.set('b');
      expect(preference.get()).toBe('b');
    } finally {
      globalThis.window = originalWindow;
    }

    // Once storage works again, storage wins
    preference.set('a');
    expect(preference.get()).toBe('a');
  });
});

describe('useStoredPreference', () => {
  test('re-renders when the value changes', () => {
    const preference = createModePreference();
    const { result } = renderHook(() => useStoredPreference(preference));
    expect(result.current).toBe('a');

    act(() => preference.set('b'));
    expect(result.current).toBe('b');

    act(() => {
      localStorage.setItem(KEY, 'a');
      window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    });
    expect(result.current).toBe('a');
  });
});
