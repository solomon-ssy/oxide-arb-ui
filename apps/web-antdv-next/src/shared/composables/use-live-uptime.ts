import { computed, onScopeDispose, ref } from 'vue';

import { useSystemStore } from '#/store';

/**
 * Live uptime derived from the last {@link SystemStatus} snapshot: base
 * `uptime_secs` plus elapsed time since `checked_at`, ticked every second.
 */
export function useLiveUptime() {
  const systemStore = useSystemStore();
  const tick = ref(0);
  const timer = setInterval(() => {
    tick.value += 1;
  }, 1000);
  onScopeDispose(() => clearInterval(timer));

  const uptimeSecs = computed(() => {
    void tick.value;
    const status = systemStore.status;
    if (!status) {
      return null;
    }
    const checkedAtMs = Date.parse(status.checked_at);
    const elapsedSecs = Number.isNaN(checkedAtMs)
      ? 0
      : Math.max(0, Math.floor((Date.now() - checkedAtMs) / 1000));
    return status.uptime_secs + elapsedSecs;
  });

  return { uptimeSecs };
}
