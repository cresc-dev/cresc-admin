import { afterEach, describe, expect, mock, test } from 'bun:test';
import { testUrls } from './helper';

// ─── testUrls (hedged endpoint race) ────────────────────────────────

describe('testUrls', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('returns null for empty or missing urls', async () => {
    expect(await testUrls([])).toBeNull();
    expect(await testUrls(undefined)).toBeNull();
  });

  test('only pings the first url when it answers within the hedge delay', async () => {
    const fetchMock = mock(
      () =>
        new Promise((resolve) => setTimeout(() => resolve({ status: 200 }), 5)),
    );
    globalThis.fetch = fetchMock as any;

    const result = await testUrls(
      ['https://a/status', 'https://b/status'],
      500,
    );
    expect(result).toBe('https://a/status');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('does not wait for a slow first url and aborts the loser', async () => {
    const signals: Record<string, AbortSignal | undefined> = {};
    const fetchMock = mock(
      (url: string, options?: { signal?: AbortSignal }) =>
        new Promise((resolve, reject) => {
          signals[url] = options?.signal;
          const ms = url === 'https://slow/status' ? 1900 : 10;
          const timer = setTimeout(() => resolve({ status: 200 }), ms);
          options?.signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(Error('aborted'));
          });
        }),
    );
    globalThis.fetch = fetchMock as any;

    const start = Date.now();
    const result = await testUrls(
      ['https://slow/status', 'https://fast/status'],
      20,
    );
    const elapsed = Date.now() - start;

    expect(result).toBe('https://fast/status');
    expect(elapsed < 500).toBe(true);
    expect(signals['https://slow/status']?.aborted).toBe(true);
    expect(signals['https://fast/status']?.aborted).toBe(false);
  });

  test('hedges immediately when a ping fails before the delay elapses', async () => {
    const fetchMock = mock((url: string) => {
      if (url === 'https://bad/status') {
        return Promise.reject(Error('down'));
      }
      return new Promise((resolve) =>
        setTimeout(() => resolve({ status: 200 }), 5),
      );
    });
    globalThis.fetch = fetchMock as any;

    const start = Date.now();
    const result = await testUrls(
      ['https://bad/status', 'https://good/status'],
      1500,
    );
    const elapsed = Date.now() - start;

    expect(result).toBe('https://good/status');
    expect(elapsed < 500).toBe(true);
  });

  test('falls back to the first url when every ping fails', async () => {
    const fetchMock = mock(() => Promise.resolve({ status: 500 }));
    globalThis.fetch = fetchMock as any;

    const result = await testUrls(['https://a/status', 'https://b/status'], 0);
    expect(result).toBe('https://a/status');
  });
});
