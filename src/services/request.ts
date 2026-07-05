import { message } from 'antd';
import { testUrls } from '@/utils/helper';
import { buildRequest, type HttpMethod } from './build-request';
import { handleResponse, RequestError, type RequestOptions } from './response';

export type { RequestOptions };
export { RequestError };

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

const testPath = '/task/list';
const getBaseUrl = (async () => {
  return testUrls(SERVER.main.map((url) => `${url}${testPath}`)).then((ret) => {
    let baseUrl = SERVER.main[0];
    if (ret) {
      // remove testPath
      baseUrl = ret.replace(testPath, '');
    }
    console.log('baseUrl', baseUrl);
    return baseUrl;
  });
})();

export default async function request<T extends Record<any, any>>(
  method: HttpMethod,
  path: string,
  params?: Record<any, any>,
  requestOptions: RequestOptions = {},
) {
  const baseUrl = requestOptions.baseUrl ?? (await getBaseUrl);
  const { url, options } = buildRequest({
    method,
    path,
    baseUrl,
    params,
    token: _token,
  });
  try {
    const response = await fetch(url, options);
    return await handleResponse<T>(response, requestOptions);
  } catch (err) {
    if (err instanceof RequestError) {
      throw err;
    }

    // Network-level failure (DNS, TLS, CORS, offline); parsed business errors
    // are already toasted and rethrown by handleResponse above.
    if (!requestOptions.suppressErrorToast) {
      message.error(`Error: ${(err as Error).message}`);
    }
    throw err;
  }
}
