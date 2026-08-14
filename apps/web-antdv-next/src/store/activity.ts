import { ref } from 'vue';

import { defineStore } from 'pinia';

const REFRESH_COALESCE_MS = 350;

/**
 * Bounded invalidation coordinator for the REST-authoritative activity feed.
 * Domain WebSocket frames collapse into one refresh and hidden pages retain a
 * dirty bit instead of polling or issuing background reads.
 */
export const useActivityStore = defineStore('qp-activity', () => {
  const refreshGeneration = ref(0);
  const dirty = ref(true);
  const pageVisible = ref(
    typeof document === 'undefined' || document.visibilityState === 'visible',
  );
  let refreshTimer: null | ReturnType<typeof setTimeout> = null;

  function flush() {
    refreshTimer = null;
    if (!pageVisible.value || !dirty.value) {
      return;
    }
    dirty.value = false;
    refreshGeneration.value += 1;
  }

  function schedule() {
    if (!pageVisible.value || refreshTimer !== null) {
      return;
    }
    refreshTimer = setTimeout(flush, REFRESH_COALESCE_MS);
  }

  function invalidate() {
    dirty.value = true;
    schedule();
  }

  function setPageVisible(visible: boolean) {
    pageVisible.value = visible;
    if (visible && dirty.value) {
      schedule();
    }
  }

  function $reset() {
    if (refreshTimer !== null) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    refreshGeneration.value = 0;
    dirty.value = true;
    pageVisible.value =
      typeof document === 'undefined' || document.visibilityState === 'visible';
  }

  return {
    $reset,
    dirty,
    invalidate,
    pageVisible,
    refreshGeneration,
    setPageVisible,
  };
});
