import type { NavigateOptions, SetURLSearchParams } from 'react-router-dom';

export function isPasswordValid(password: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,16}$/.test(password);
}

export function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export const ping = async (url: string) => {
  let pingFinished = false;
  return Promise.race([
    fetch(url, {
      method: 'HEAD',
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
        console.log('ping error', url, e);
        throw Error('ping error');
      }),
    new Promise((_, reject) =>
      setTimeout(() => {
        reject(Error('ping timeout'));
        if (!pingFinished) {
          console.log('ping timeout', url);
        }
      }, 2000),
    ),
  ]) as Promise<string | null>;
};

export const testUrls = async (urls?: string[]) => {
  if (!urls?.length) {
    return null;
  }
  try {
    return await Promise.any(urls.map(ping));
  } catch {
    console.log('all ping failed, use first url:', urls[0]);
    return urls[0];
  }
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
