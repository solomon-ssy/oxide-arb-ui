import type { Ref } from 'vue';

import { getCurrentScope, onScopeDispose, readonly, ref } from 'vue';

/** Options controlling the polling loop lifecycle. */
export interface UsePollingOptions<T> {
  /** Run the first tick immediately on `start()` instead of waiting one interval. Defaults to `true`. */
  immediate?: boolean;
  /** Delay between the end of one tick and the start of the next, in ms. Defaults to `5000`. */
  interval?: number;
  /** Invoked when a tick rejects; polling continues unless stopped explicitly. */
  onError?: (error: unknown) => void;
  /** Suspend ticks while `document.visibilityState === 'hidden'`. Defaults to `true`. */
  pauseOnHidden?: boolean;
  /** Stop polling permanently once the predicate returns `true` for a tick result. */
  until?: (result: T) => boolean;
}

/** Handle returned by {@link usePolling}. */
export interface UsePollingReturn {
  /** Whether the loop is currently scheduled (true between `start()` and `stop()`/`until`). */
  isActive: Readonly<Ref<boolean>>;
  /** Begin polling. No-op when already active. */
  start: () => void;
  /** Stop polling and cancel any pending tick. */
  stop: () => void;
}

/**
 * Compensating poll loop for data without a WebSocket channel (e.g. replay
 * run status, materialization progress).
 *
 * Ticks never overlap: the next tick is scheduled only after the previous
 * request settles. The loop pauses while the document is hidden (configurable)
 * and is torn down automatically with the owning effect scope.
 */
export function usePolling<T>(
  fn: () => Promise<T>,
  options: UsePollingOptions<T> = {},
): UsePollingReturn {
  const {
    immediate = true,
    interval = 5000,
    onError,
    pauseOnHidden = true,
    until,
  } = options;

  const isActive = ref(false);
  let timer: null | ReturnType<typeof setTimeout> = null;

  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function isHidden() {
    return (
      pauseOnHidden &&
      typeof document !== 'undefined' &&
      document.visibilityState === 'hidden'
    );
  }

  function schedule(delay: number) {
    clearTimer();
    timer = setTimeout(tick, delay);
  }

  async function tick() {
    if (!isActive.value) {
      return;
    }
    // While hidden, idle-wait without issuing requests.
    if (isHidden()) {
      schedule(interval);
      return;
    }
    try {
      const result = await fn();
      if (until?.(result)) {
        stop();
        return;
      }
    } catch (error) {
      onError?.(error);
    }
    if (isActive.value) {
      schedule(interval);
    }
  }

  function start() {
    if (isActive.value) {
      return;
    }
    isActive.value = true;
    immediate ? void tick() : schedule(interval);
  }

  function stop() {
    isActive.value = false;
    clearTimer();
  }

  function onVisibilityChange() {
    // Resume promptly when the tab becomes visible again.
    if (isActive.value && !isHidden()) {
      schedule(0);
    }
  }

  if (pauseOnHidden && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      stop();
      if (pauseOnHidden && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    });
  }

  return { isActive: readonly(isActive), start, stop };
}
