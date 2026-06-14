import type { ResponseInterceptorConfig } from '../request-client/types';
import type { OxideRequestConfig } from './contract';

import { readRequestConfig } from './contract';
import { normalizeApiError, shouldAutoToast } from './normalize';
import { showApiError } from './present';

/**
 * Response interceptor: normalize every rejection to {@link ApiError}.
 * Toasts are owned by {@link wrapRequestClient} / {@link useRequestHandler}.
 */
export function oxideNormalizeErrorInterceptor(): ResponseInterceptorConfig {
  return {
    rejected: (error: unknown) => Promise.reject(normalizeApiError(error)),
  };
}

/** Attach auto-toast + {@link ApiError} propagation to all HTTP verbs. */
export function wrapRequestClient(client: {
  request: (url: string, config?: OxideRequestConfig) => Promise<unknown>;
}): void {
  const originalRequest = client.request.bind(client);
  client.request = async (
    url: string,
    config?: OxideRequestConfig,
  ): Promise<unknown> => {
    try {
      return await originalRequest(url, config);
    } catch (error) {
      const apiError = normalizeApiError(error);
      const effectiveConfig = config ?? readRequestConfig(error);
      if (shouldAutoToast(apiError, effectiveConfig)) {
        showApiError(apiError);
      }
      throw apiError;
    }
  };
}
