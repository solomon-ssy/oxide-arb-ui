import type { RequestClientOptions } from '@vben/request';

/**
 * oxide-arb HTTP client wiring.
 *
 * Error pipeline lives in `@vben/request/qp`:
 * normalize → auto-toast (unless silent) → useRequestHandler fallback
 */
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
import {
  clearAccessTokenAcrossTabs,
  refreshAccessToken,
} from '#/auth/refresh-coordinator';
import { useAuthStore } from '#/store';

import { refreshTokenApi } from './core';

configureErrorNotifier((text) => message.error(text));

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
    withCredentials: true,
  });

  async function doReAuthenticate() {
    const accessStore = useAccessStore();
    const authStore = useAuthStore();
    clearAccessTokenAcrossTabs();
    if (
      preferences.app.loginExpiredMode === 'modal' &&
      accessStore.isAccessChecked
    ) {
      accessStore.setLoginExpired(true);
    } else {
      await authStore.logout();
    }
  }

  async function doRefreshToken(failedAuthorization?: null | string) {
    return refreshAccessToken(refreshTokenApi, failedAuthorization);
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

export const baseRequestClient = new RequestClient({
  baseURL: apiURL,
  withCredentials: true,
});

baseRequestClient.addRequestInterceptor({
  fulfilled: async (config) => {
    Object.assign(config.headers, buildApiHeaders());
    return config;
  },
});
