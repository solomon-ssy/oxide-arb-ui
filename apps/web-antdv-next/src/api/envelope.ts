import type { ApiEnvelope } from '@vben/types';

/** Axios raw response body shape from `baseRequestClient` (`responseReturn: 'raw'`). */
export type ApiRawResponse<T> = { data: ApiEnvelope<T> };

/** Structured error from oxide-arb-web JSON envelope (`code !== 200`). */
export class ApiError extends Error {
  readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/**
 * Unwrap `{ code, message, data }` from oxide-arb-web.
 * Use for `baseRequestClient` calls that bypass the business interceptor chain.
 */
export function unwrapApiEnvelope<T>(envelope: ApiEnvelope<T>): T {
  if (envelope.code !== 200) {
    throw new ApiError(envelope.code, envelope.message || 'Request failed');
  }
  return envelope.data as T;
}

/** Parse a raw axios response from `baseRequestClient.post/get`. */
export function unwrapApiResponse<T>(response: ApiRawResponse<T>): T {
  return unwrapApiEnvelope(response.data);
}
