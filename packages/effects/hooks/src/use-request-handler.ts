/**
 * Uniform async request wrapper for page-level handlers.
 *
 * Pages must never hand-roll bare try/catch around API calls — they go
 * through `handleRequest`, which normalizes the error path (interceptors have
 * already surfaced a toast) and returns `null` so callers can branch on the
 * result without rethrowing.
 */
export function useRequestHandler() {
  const handleRequest = async <T>(
    requestFn: () => Promise<T>,
    successCallback?: (res: T) => void,
    errorCallback?: (error: any) => void,
  ): Promise<null | T> => {
    try {
      const result: T = await requestFn();
      successCallback && successCallback(result);
      return result;
    } catch (error: any) {
      errorCallback && errorCallback(error);
      return null;
    }
  };

  return { handleRequest };
}
