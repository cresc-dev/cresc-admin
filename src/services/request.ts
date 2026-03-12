import { message } from 'antd';
import { testUrls } from '@/utils/helper';
import { logout } from './auth';

// eslint-disable-next-line @typescript-eslint/naming-convention
let _token = localStorage.getItem('token');

export const setToken = (token: string) => {
  _token = token;
  localStorage.setItem('token', token);
};

export const getToken = () => _token;

const SERVER = {
  main:
    process.env.NODE_ENV === 'production'
      ? ['https://api.cresc.dev', 'https://api.cresc.app']
      : [process.env.PUBLIC_API ?? 'http://localhost:9000'],
};

const getBaseUrl = (async () => {
  return testUrls(SERVER.main.map((url) => `${url}/status`)).then((ret) => {
    let baseUrl = SERVER.main[0];
    if (ret) {
      // remove /status
      baseUrl = ret.replace('/status', '');
    }
    console.log('baseUrl', baseUrl);
    return baseUrl;
  });
})();

interface PushyResponse {
  message?: string;
}

export class RequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
  }
}

export interface RequestOptions {
  suppressErrorToast?: boolean;
}

export default async function request<T extends Record<any, any>>(
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  params?: Record<any, any>,
  requestOptions: RequestOptions = {},
) {
  const headers: HeadersInit = {};
  const options: RequestInit = { method, headers };
  const baseUrl = await getBaseUrl;
  let url = `${baseUrl}${path}`;
  if (_token) {
    headers['x-accesstoken'] = _token;
  }
  if (params) {
    if (method === 'get') {
      url += `?${new URLSearchParams(params).toString()}`;
    } else {
      headers['content-type'] = 'application/json';
      options.body = JSON.stringify(params);
    }
  }
  try {
    const response = await fetch(url, options);
    if (response.status === 401) {
      logout();
      return;
    }

    const text = await response.text();
    let json: PushyResponse = {};
    if (text) {
      try {
        json = JSON.parse(text) as PushyResponse;
      } catch {
        json = {
          message: text,
        };
      }
    }

    if (response.ok) {
      return json as T & PushyResponse;
    }

    const error = new RequestError(
      json.message || `Request failed with status ${response.status}`,
      response.status,
    );
    if (!requestOptions.suppressErrorToast && error.message) {
      message.error(error.message);
    }
    throw error;
  } catch (err) {
    if (err instanceof RequestError) {
      throw err;
    }

    if ((err as Error).message.includes('Unauthorized')) {
      logout();
    } else {
      if (!requestOptions.suppressErrorToast) {
        message.error(`Error: ${(err as Error).message}`);
      }
      throw err;
    }
  }
}
