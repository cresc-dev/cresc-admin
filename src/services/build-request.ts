export type HttpMethod = 'get' | 'post' | 'put' | 'delete';

/**
 * Pure request construction (url + fetch options), extracted from request.ts
 * so it can be unit-tested without the network/toast side effects there.
 */
export function buildRequest({
  method,
  path,
  baseUrl,
  params,
  token,
  accountId,
  withCredentials,
  timezone,
}: {
  method: HttpMethod;
  path: string;
  baseUrl: string;
  params?: Record<string, any>;
  token?: string | null;
  /** Selected workspace account id; sent as x-account-id when present. */
  accountId?: number | null;
  /** Send cookies cross-origin — required for httpOnly-cookie sessions. */
  withCredentials?: boolean;
  /** IANA zone the day-bucketed analytics should be summed in (x-timezone). */
  timezone?: string;
}): { url: string; options: RequestInit } {
  const headers: Record<string, string> = {};
  const options: RequestInit = { method, headers };
  if (withCredentials) {
    options.credentials = 'include';
  }
  let url = `${baseUrl.replace(/\/$/, '')}${path}`;
  if (token) {
    headers['x-accesstoken'] = token;
  }
  if (accountId) {
    headers['x-account-id'] = String(accountId);
  }
  if (timezone) {
    headers['x-timezone'] = timezone;
  }
  if (params) {
    if (method === 'get') {
      url += `?${new URLSearchParams(params).toString()}`;
    } else {
      headers['content-type'] = 'application/json';
      options.body = JSON.stringify(params);
    }
  }
  return { url, options };
}
