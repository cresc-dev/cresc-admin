import { message } from 'antd';
import { getVersionHealthDevMock } from '@/services/version-health-dev-mock';
import { FEATURES } from '@/utils/features';
import { testUrls } from '@/utils/helper';
import { getCustomBaseUrl } from '@/utils/endpoint';
import { buildRequest, type HttpMethod } from './build-request';
import { handleResponse, RequestError, type RequestOptions } from './response';
import { getToken, usesCookieSession } from './session';
import { getWorkspaceAccountId } from './workspace';

// Session state lives in ./session; re-export the legacy surface so existing
// importers (auth, router, hooks, tests) keep working unchanged.
export {
  clearSession,
  getToken,
  hasSession,
  markCookieSession,
  setToken,
  usesCookieSession,
} from './session';
export type { RequestOptions };
export { RequestError };

const SERVER = {
  main:
    process.env.NODE_ENV === 'production'
      ? ['https://api.cresc.dev', 'https://api.cresc.app']
      : [process.env.PUBLIC_API ?? 'http://localhost:9000'],
};

const testPath = '/task/list';
const getBaseUrl = FEATURES.versionHealthMock
  ? Promise.resolve(SERVER.main[0])
  : testUrls(SERVER.main.map((url) => `${url}${testPath}`)).then((ret) => {
      let baseUrl = SERVER.main[0];
      if (ret) {
        // remove testPath
        baseUrl = ret.replace(testPath, '');
      }
      console.log('baseUrl', baseUrl);
      return baseUrl;
    });

export default async function request<T extends Record<any, any>>(
  method: HttpMethod,
  path: string,
  params?: Record<any, any>,
  requestOptions: RequestOptions = {},
) {
  if (FEATURES.versionHealthMock) {
    const mock = getVersionHealthDevMock(method, path);
    if (mock !== null) {
      return mock as unknown as T;
    }
  }

  const baseUrl =
    requestOptions.baseUrl ?? getCustomBaseUrl() ?? (await getBaseUrl);
  const { url, options } = buildRequest({
    method,
    path,
    baseUrl,
    params,
    token: getToken(),
    accountId: getWorkspaceAccountId(),
    // Only send cookies once the server has switched us to a cookie session,
    // so current wildcard-CORS deployments keep working untouched.
    withCredentials: usesCookieSession(),
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
