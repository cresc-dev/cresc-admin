import { useCallback, useEffect, useRef, useState } from 'react';

// Turnstile is off unless the build sets PUBLIC_TURNSTILE_SITE_KEY (the
// cresc-admin auth widget is 0x4AAAAAAFJyCK2V9ge-PeCK). Turn it on only
// together with TURNSTILE_SECRET on the API, which redeems each token.
export const TURNSTILE_SITE_KEY = process.env.PUBLIC_TURNSTILE_SITE_KEY || '';

export type TurnstileAction = 'register' | 'resetpwd' | 'activate';

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () =>
      window.turnstile
        ? resolve(window.turnstile)
        : reject(new Error('turnstile unavailable'));
    script.onerror = () => {
      // Let a later mount retry instead of caching the failure.
      scriptPromise = undefined;
      reject(new Error('turnstile failed to load'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Renders a Turnstile widget for one protected action. `ready` gates the
 * submit button; it is always true while Turnstile is off. Tokens are
 * single-use: call `reset` after every request that spent `token`.
 */
export function useTurnstile(action: TurnstileAction) {
  const [token, setToken] = useState<string>();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetId.current = turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          callback: setToken,
          'expired-callback': () => setToken(undefined),
          'error-callback': () => setToken(undefined),
        });
      })
      .catch(() => {
        // The submit stays disabled without a token; nothing else to do.
      });
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = undefined;
    };
  }, [action]);

  const reset = useCallback(() => {
    setToken(undefined);
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  }, []);

  const widget = TURNSTILE_SITE_KEY ? (
    <div
      ref={containerRef}
      style={{ display: 'flex', justifyContent: 'center', minHeight: 65 }}
    />
  ) : null;

  return { token, reset, widget, ready: !TURNSTILE_SITE_KEY || !!token };
}
