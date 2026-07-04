import type { RequestClientOptions } from '@vben/request';
/**
 * oxide-arb HTTP client wiring.
 *
 * Error pipeline lives in `@vben/request/qp`:
 * normalize → auto-toast (unless silent) → useRequestHandler fallback
 */
import type { TokenResponse } from '@vben/types';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  authenticateResponseInterceptor,
  defaultResponseInterceptor,
  RequestClient,
} from '@vben/request';
import {
  configureErrorNotifier,
  qpNormalizeErrorInterceptor,
  wrapRequestClient,
} from '@vben/request/qp';
import { useAccessStore } from '@vben/stores';

import { message } from 'antdv-next';

import { buildApiHeaders } from '#/api/headers';
import { useAuthStore } from '#/store';

import { refreshTokenApi } from './core';

configureErrorNotifier((text) => message.error(text));

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
  });

  async function doReAuthenticate() {
    const accessStore = useAccessStore();
    const authStore = useAuthStore();
    accessStore.setAccessToken(null);
    if (
      preferences.app.loginExpiredMode === 'modal' &&
      accessStore.isAccessChecked
    ) {
      accessStore.setLoginExpired(true);
    } else {
      await authStore.logout();
    }
  }

  async function doRefreshToken() {
    const accessStore = useAccessStore();
    const refreshToken = accessStore.refreshToken;
    if (!refreshToken) {
      throw new Error('Refresh token is missing');
    }
    const resp: TokenResponse = await refreshTokenApi({
      refresh_token: refreshToken,
    });
    accessStore.setAccessToken(resp.access_token);
    accessStore.setRefreshToken(resp.refresh_token);
    return resp.access_token;
  }

  function formatToken(token: null | string) {
    return token ? `Bearer ${token}` : null;
  }

  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();

      const apiHeaders = buildApiHeaders();
      config.headers.Authorization = formatToken(accessStore.accessToken);
      Object.assign(config.headers, apiHeaders);
      return config;
    },
  });

  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      // Async research enqueue endpoints return HTTP 202 (`code: 202`); treat any
      // 2xx envelope as success so governed POST handoffs do not fail client-side.
      successCode: (code: number) => code >= 200 && code < 300,
    }),
  );

  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate,
      doRefreshToken,
      enableRefreshToken: preferences.app.enableRefreshToken,
      formatToken,
    }),
  );

  client.addResponseInterceptor(qpNormalizeErrorInterceptor());

  wrapRequestClient(
    client as unknown as Parameters<typeof wrapRequestClient>[0],
  );

  return client;
}

export const requestClient = createRequestClient(apiURL, {
  responseReturn: 'data',
  // Long-running research work is async (job engine); admin requests are all
  // fast enqueue/poll/list calls. A 30s ceiling absorbs slower list/aggregate
  // reads without the old 10s default aborting them mid-flight.
  timeout: 30_000,
});

export const baseRequestClient = new RequestClient({ baseURL: apiURL });

baseRequestClient.addRequestInterceptor({
  fulfilled: async (config) => {
    Object.assign(config.headers, buildApiHeaders());
    return config;
  },
});
