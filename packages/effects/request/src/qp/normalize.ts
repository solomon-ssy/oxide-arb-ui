import type { ApiEnvelope } from './contract';

import { $t } from '@vben/locales';

/** Classification for operator messaging and retry policy. */
export type ApiErrorKind =
  | 'business'
  | 'cancelled'
  | 'http'
  | 'network'
  | 'timeout';

/**
 * Normalized failure for every quant-pivot HTTP path (`requestClient`, `baseRequestClient`,
 * `useRequestHandler`, governed mutations).
 */
export class ApiError extends Error {
  /** Wire `code` from the JSON envelope (often mirrors HTTP status on errors). */
  readonly code: number;
  readonly httpStatus: number | undefined;
  readonly kind: ApiErrorKind;
  /** Whether {@link showApiError} already ran for this instance. */
  toastShown = false;

  constructor(params: {
    code?: number;
    httpStatus?: number;
    kind: ApiErrorKind;
    message: string;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.kind = params.kind;
    this.httpStatus = params.httpStatus;
    this.code = params.code ?? params.httpStatus ?? 0;
  }

  static is(value: unknown): value is ApiError {
    return value instanceof ApiError;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isApiEnvelope(value: unknown): value is ApiEnvelope {
  return (
    isRecord(value) &&
    typeof value.code === 'number' &&
    typeof value.message === 'string'
  );
}

function readEnvelope(error: unknown): ApiEnvelope | undefined {
  if (isApiEnvelope(error)) {
    return {
      code: Number(error.code),
      data: (error.data as unknown) ?? null,
      message: error.message,
    };
  }
  if (!isRecord(error)) {
    return undefined;
  }
  const response = error.response;
  if (isRecord(response) && isApiEnvelope(response.data)) {
    return {
      code: Number(response.data.code),
      data: response.data.data ?? null,
      message: response.data.message,
    };
  }
  if (isApiEnvelope(error.data)) {
    return {
      code: Number(error.data.code),
      data: error.data.data ?? null,
      message: error.data.message,
    };
  }
  return undefined;
}

function readHttpStatus(error: unknown): number | undefined {
  if (!isRecord(error)) {
    return undefined;
  }
  const response = error.response;
  if (isRecord(response) && typeof response.status === 'number') {
    return response.status;
  }
  if (typeof error.status === 'number') {
    return error.status;
  }
  return undefined;
}

function isNetworkError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }
  const text = String(error.message ?? error.toString?.() ?? '');
  return text.includes('Network Error');
}

function isTimeoutError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }
  const text = String(error.message ?? '');
  return text.includes('timeout') || error.code === 'ECONNABORTED';
}

function isGenericAxiosMessage(message: string): boolean {
  return /^Request failed with status code \d+$/u.test(message);
}

function resolveHttpStatus(
  error: unknown,
  envelopeCode: number,
): number | undefined {
  const fromTransport = readHttpStatus(error);
  if (fromTransport !== undefined) {
    return fromTransport;
  }
  if (envelopeCode >= 400 && envelopeCode < 600) {
    return envelopeCode;
  }
  return undefined;
}

function isCancelledError(error: unknown): boolean {
  return isRecord(error) && error.__CANCEL__ === true;
}

function fallbackHttpMessage(status: number | undefined): string {
  switch (status) {
    case 400: {
      return $t('ui.fallback.http.badRequest');
    }
    case 401: {
      return $t('ui.fallback.http.unauthorized');
    }
    case 403: {
      return $t('ui.fallback.http.forbidden');
    }
    case 404: {
      return $t('ui.fallback.http.notFound');
    }
    case 408: {
      return $t('ui.fallback.http.requestTimeout');
    }
    case 409: {
      return $t('ui.fallback.http.conflict');
    }
    default: {
      return $t('ui.fallback.http.internalServerError');
    }
  }
}

/**
 * Single entry point: coerce axios rejects, envelope throws, and legacy shapes
 * into {@link ApiError}.
 */
export function normalizeApiError(error: unknown): ApiError {
  if (ApiError.is(error)) {
    return error;
  }

  if (isCancelledError(error)) {
    return new ApiError({
      kind: 'cancelled',
      message: 'Request cancelled',
    });
  }

  const envelope = readEnvelope(error);
  if (envelope) {
    return new ApiError({
      code: envelope.code,
      httpStatus: resolveHttpStatus(error, envelope.code),
      kind: envelope.code === 200 ? 'http' : 'business',
      message: envelope.message || 'Request failed',
    });
  }

  if (isNetworkError(error)) {
    return new ApiError({
      kind: 'network',
      message: $t('ui.fallback.http.networkError'),
    });
  }

  if (isTimeoutError(error)) {
    return new ApiError({
      kind: 'timeout',
      message: $t('ui.fallback.http.requestTimeout'),
    });
  }

  const httpStatus = readHttpStatus(error);
  const rawMessage = isRecord(error) ? String(error.message ?? '') : '';
  const message =
    rawMessage && !isGenericAxiosMessage(rawMessage)
      ? rawMessage
      : fallbackHttpMessage(httpStatus);

  return new ApiError({
    code: httpStatus ?? 0,
    httpStatus,
    kind: 'http',
    message,
  });
}

/** Operator-facing text with business message preferred over generic HTTP labels. */
export function getApiErrorMessage(error: unknown): string {
  return normalizeApiError(error).message;
}

/** Whether the global toast should run for this failure + request config. */
export function shouldAutoToast(
  error: ApiError,
  config?: { silentError?: boolean },
): boolean {
  if (config?.silentError) {
    return false;
  }
  if (error.toastShown) {
    return false;
  }
  if (error.kind === 'cancelled') {
    return false;
  }
  if (error.httpStatus === 401 || error.code === 401) {
    return false;
  }
  return true;
}
