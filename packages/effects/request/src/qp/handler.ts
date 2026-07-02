import type { ApiError } from './normalize';

import { normalizeApiError } from './normalize';
import { showApiError } from './present';

export interface HandleRequestOptions<T> {
  /** Custom operator toast copy (overrides {@link ApiError.message}). */
  errorMessage?: string;
  /** Called with the normalized failure after optional auto-toast. */
  onError?: (error: ApiError) => void;
  /** Called when the request resolves successfully. */
  onSuccess?: (result: T) => void;
  /**
   * Suppress toast for this handler invocation.
   * Prefer {@link withSilentError} on the axios config for background APIs.
   */
  silent?: boolean;
}

/**
 * Page-level async wrapper for quant-pivot API calls.
 *
 * - Success: runs success hook, returns data
 * - Failure: normalized {@link ApiError}; toast once unless transport/handler silenced
 * - Never rethrows — callers branch on `null`
 */
export function useRequestHandler() {
  async function handleRequest<T>(
    requestFn: () => Promise<T>,
    successCallback?: (result: T) => void,
    errorCallback?: (error: ApiError) => void,
  ): Promise<null | T>;
  async function handleRequest<T>(
    requestFn: () => Promise<T>,
    options?: HandleRequestOptions<T>,
  ): Promise<null | T>;
  async function handleRequest<T>(
    requestFn: () => Promise<T>,
    second?: ((result: T) => void) | HandleRequestOptions<T>,
    third?: (error: ApiError) => void,
  ): Promise<null | T> {
    const options: HandleRequestOptions<T> | undefined =
      typeof second === 'function'
        ? { onError: third, onSuccess: second }
        : second;

    try {
      const result = await requestFn();
      options?.onSuccess?.(result);
      return result;
    } catch (error) {
      const apiError = normalizeApiError(error);
      options?.onError?.(apiError);
      if (!apiError.toastShown && !options?.silent) {
        showApiError(apiError, { message: options?.errorMessage });
      }
      return null;
    }
  }

  return { handleRequest };
}
