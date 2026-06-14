import type { AxiosRequestConfig } from 'axios';

import { ApiError } from './normalize';

/** oxide-arb-web JSON envelope (`WebResponse` / `WebError`). */
export interface ApiEnvelope<T = unknown> {
  code: number;
  message: string;
  data: null | T;
}

/** Axios raw response body from `baseRequestClient` (`responseReturn: 'raw'`). */
export type ApiRawResponse<T> = { data: ApiEnvelope<T> };

/**
 * Per-request UX flags carried on axios config.
 * Use {@link withSilentError} for background / caller-owned feedback paths.
 */
export interface OxideRequestMeta {
  /** Suppress the global operator toast; caller owns error presentation. */
  silentError?: boolean;
}

export type OxideRequestConfig = AxiosRequestConfig & OxideRequestMeta;

/** Merge `silentError: true` into an axios config. */
export function withSilentError<
  T extends AxiosRequestConfig = AxiosRequestConfig,
>(config?: T): T & { silentError: true } {
  return { ...config, silentError: true } as T & { silentError: true };
}

/** Resolve axios config from a rejection or interceptor throw shape. */
export function readRequestConfig(
  error: unknown,
): OxideRequestConfig | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  const candidate = error as Record<string, unknown>;
  const direct = candidate.config;
  if (direct && typeof direct === 'object') {
    return direct as OxideRequestConfig;
  }
  const response = candidate.response as Record<string, unknown> | undefined;
  const nested = response?.config;
  if (nested && typeof nested === 'object') {
    return nested as OxideRequestConfig;
  }
  return undefined;
}

/**
 * Unwrap `{ code, message, data }` from oxide-arb-web.
 * Use for `baseRequestClient` calls that bypass the business interceptor chain.
 */
export function unwrapApiEnvelope<T>(envelope: ApiEnvelope<T>): T {
  if (envelope.code !== 200) {
    throw new ApiError({
      code: envelope.code,
      httpStatus: envelope.code >= 400 ? envelope.code : undefined,
      kind: 'business',
      message: envelope.message || 'Request failed',
    });
  }
  return envelope.data as T;
}

/** Parse a raw axios response from `baseRequestClient.post/get`. */
export function unwrapApiResponse<T>(response: ApiRawResponse<T>): T {
  return unwrapApiEnvelope(response.data);
}
