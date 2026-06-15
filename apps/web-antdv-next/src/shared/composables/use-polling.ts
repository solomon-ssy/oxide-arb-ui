import type { Ref } from 'vue';

import { onUnmounted, watch } from 'vue';

export interface UsePollingOptions {
  /** Poll interval in milliseconds. */
  intervalMs: number;
  /** When false, the timer is cleared. */
  enabled: Ref<boolean>;
  /** Skip ticks while the document is hidden. Default `true`. */
  pauseOnHidden?: boolean;
  /** Invoke `tick` once when `enabled` becomes true. Default `false`. */
  immediate?: boolean;
}

/**
 * Interval poller with optional document-visibility pause. Clears the timer on
 * disable and component unmount (phase 7.6 replay drawer / dashboard cadence).
 */
export function usePolling(
  tick: () => Promise<void> | void,
  options: UsePollingOptions,
) {
  const pauseOnHidden = options.pauseOnHidden ?? true;
  let timer: ReturnType<typeof setInterval> | undefined;

  function stop() {
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  }

  function start() {
    stop();
    timer = setInterval(() => {
      if (pauseOnHidden && document.hidden) {
        return;
      }
      void tick();
    }, options.intervalMs);
  }

  watch(
    options.enabled,
    (on) => {
      if (on) {
        if (options.immediate) {
          void tick();
        }
        start();
      } else {
        stop();
      }
    },
    { immediate: true },
  );

  onUnmounted(stop);

  return { start, stop };
}
