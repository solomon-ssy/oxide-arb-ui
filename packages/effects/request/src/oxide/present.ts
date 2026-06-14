import type { ApiError } from './normalize';

import { normalizeApiError } from './normalize';

export interface ShowApiErrorOptions {
  /** Force-suppress toast even when auto-toast would run. */
  silent?: boolean;
  /** Override the operator-visible message. */
  message?: string;
}

type ErrorNotifier = (message: string) => void;

let notifyError: ErrorNotifier = (message) => {
  console.error(`[oxide-api] ${message}`);
};

/**
 * Wire the UI notifier once at app bootstrap (`request.ts`).
 * Keeps `@vben/request` free of antdv-next.
 */
export function configureErrorNotifier(notifier: ErrorNotifier): void {
  notifyError = notifier;
}

/** Present an operator toast unless already shown or explicitly silenced. */
export function showApiError(
  error: unknown,
  options?: ShowApiErrorOptions,
): ApiError {
  const apiError = normalizeApiError(error);
  if (options?.silent || apiError.toastShown || apiError.kind === 'cancelled') {
    return apiError;
  }
  if (apiError.httpStatus === 401 || apiError.code === 401) {
    return apiError;
  }

  notifyError(options?.message ?? apiError.message);
  apiError.toastShown = true;
  return apiError;
}
