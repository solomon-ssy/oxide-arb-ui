import { describe, expect, it, vi } from 'vitest';

import {
  ApiError,
  getApiErrorMessage,
  normalizeApiError,
  shouldAutoToast,
} from '../normalize';

vi.mock('@vben/locales', () => ({
  $t: (key: string) => key,
}));

describe('normalizeApiError', () => {
  it('passes through ApiError instances', () => {
    const original = new ApiError({
      code: 409,
      httpStatus: 409,
      kind: 'business',
      message: 'conflict',
    });
    expect(normalizeApiError(original)).toBe(original);
  });

  it('reads envelope objects rethrown by RequestClient', () => {
    const error = normalizeApiError({
      code: 409,
      data: null,
      message: 'precondition failed: jwt secret weak',
    });
    expect(error.kind).toBe('business');
    expect(error.code).toBe(409);
    expect(error.httpStatus).toBe(409);
    expect(error.message).toBe('precondition failed: jwt secret weak');
  });

  it('reads axios HTTP rejections with oxide envelope bodies', () => {
    const error = normalizeApiError({
      message: 'Request failed with status code 409',
      response: {
        data: {
          code: 409,
          data: null,
          message: 'conflict: duplicate role',
        },
        status: 409,
      },
    });
    expect(error.kind).toBe('business');
    expect(error.message).toBe('conflict: duplicate role');
  });

  it('classifies axios network failures', () => {
    const error = normalizeApiError({
      message: 'Network Error',
    });
    expect(error.kind).toBe('network');
  });

  it('classifies axios timeouts', () => {
    const error = normalizeApiError({
      code: 'ECONNABORTED',
      message: 'timeout of 10000ms exceeded',
    });
    expect(error.kind).toBe('timeout');
  });

  it('classifies axios cancellations', () => {
    expect(normalizeApiError({ __CANCEL__: true }).kind).toBe('cancelled');
  });

  it('falls back to HTTP status labels when no envelope message exists', () => {
    const error = normalizeApiError({
      message: 'Request failed with status code 500',
      response: { status: 500 },
    });
    expect(error.kind).toBe('http');
    expect(error.httpStatus).toBe(500);
    expect(error.message.length).toBeGreaterThan(0);
  });
});

describe('getApiErrorMessage', () => {
  it('returns the normalized operator message', () => {
    expect(
      getApiErrorMessage({
        code: 400,
        message: 'bad request: invalid mode',
      }),
    ).toBe('bad request: invalid mode');
  });
});

describe('shouldAutoToast', () => {
  it('respects silentError on the request config', () => {
    const error = new ApiError({
      code: 409,
      kind: 'business',
      message: 'conflict',
    });
    expect(shouldAutoToast(error, { silentError: true })).toBe(false);
    expect(shouldAutoToast(error)).toBe(true);
  });

  it('never toasts cancellations or 401 auth hand-offs', () => {
    expect(
      shouldAutoToast(
        new ApiError({ kind: 'cancelled', message: 'cancelled' }),
      ),
    ).toBe(false);
    expect(
      shouldAutoToast(
        new ApiError({
          code: 401,
          httpStatus: 401,
          kind: 'business',
          message: 'unauthorized',
        }),
      ),
    ).toBe(false);
  });

  it('skips when toast already shown', () => {
    const error = new ApiError({
      code: 500,
      kind: 'http',
      message: 'fail',
    });
    error.toastShown = true;
    expect(shouldAutoToast(error)).toBe(false);
  });
});
