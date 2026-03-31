/* eslint-disable @typescript-eslint/naming-convention */
import { message } from 'antd';
import { md5 } from 'hash-wasm';
import { rootRouterPath, router } from '@/router';
import { api } from '@/services/api';
import { RequestError, setToken } from '@/services/request';

export type OAuthProvider = 'google' | 'github';

let _email = '';
export const setUserEmail = (email: string) => {
  _email = email;
};

export const getUserEmail = () => _email;

function getSearchParam(name: string) {
  return new URLSearchParams(router.state.location.search).get(name);
}

function resolveLoginFrom(loginFrom?: string | null) {
  if (!loginFrom || !loginFrom.startsWith('/') || loginFrom.startsWith('//')) {
    return rootRouterPath.user;
  }
  return loginFrom;
}

export function completeLogin(token: string, loginFrom?: string | null) {
  setToken(token);
  message.success('Successfully logged in');
  router.navigate(resolveLoginFrom(loginFrom));
}

export async function login(email: string, password: string) {
  _email = email;
  const params = { email, pwd: await md5(password) };
  try {
    const res = await api.login(params);
    if (res?.token) {
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
  if (currentPath !== rootRouterPath.login) {
    setToken('');
    router.navigate(rootRouterPath.login);
    window.location.reload();
  }
}
