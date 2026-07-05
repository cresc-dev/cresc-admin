/* eslint-disable @typescript-eslint/naming-convention */
import { message } from 'antd';
import { md5 } from 'hash-wasm';
import { rootRouterPath, router } from '@/router';
import { api } from '@/services/api';
import {
  clearSession,
  markCookieSession,
  RequestError,
  setToken,
  usesCookieSession,
} from '@/services/request';
import { resolveLoginRedirect } from '@/utils/safe-redirect';

export type OAuthProvider = 'google' | 'github';

let _email = '';
export const setUserEmail = (email: string) => {
  _email = email;
};

export const getUserEmail = () => _email;

function getSearchParam(name: string) {
  return new URLSearchParams(router.state.location.search).get(name);
}

export function completeLogin(
  token: string | null | undefined,
  loginFrom?: string | null,
) {
  if (token) {
    setToken(token);
  } else {
    // Token-less success: the server established an httpOnly cookie session.
    markCookieSession();
  }
  message.success('Successfully logged in');
  router.navigate(resolveLoginRedirect(loginFrom));
}

export async function login(email: string, password: string) {
  _email = email;
  const params = { email, pwd: await md5(password) };
  try {
    const res = await api.login(params);
    if (res) {
      completeLogin(res.token, getSearchParam('loginFrom'));
    }
  } catch (err) {
    if (err instanceof RequestError && err.status === 423) {
      router.navigate(rootRouterPath.inactivated);
    } else {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to log in';
      message.error(errorMessage);
    }
  }
}

export async function loginWithOAuth(provider: OAuthProvider) {
  try {
    const loginFrom = getSearchParam('loginFrom');
    const res = await api.getOAuthLoginUrl(provider, loginFrom || undefined);
    if (!res?.url) {
      throw Error('Failed to start social login');
    }
    window.location.assign(res.url);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Failed to start social login';
    message.error(errorMessage);
    throw err;
  }
}

export function logout() {
  const currentPath = router.state.location.pathname;
  if (usesCookieSession()) {
    // Best-effort: ask the server to clear the httpOnly cookie. Tolerates
    // servers without the endpoint (404) or an already-dead session. A 401
    // here re-enters logout(), which terminates immediately because
    // clearSession() below has already dropped the cookie-session flag.
    api.logout().catch(() => {});
  }
  clearSession();
  if (currentPath !== rootRouterPath.login) {
    router.navigate(rootRouterPath.login);
  }
  window.location.reload();
}
