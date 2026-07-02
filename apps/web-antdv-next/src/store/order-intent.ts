import type { IntentLifecycleEvent } from '@vben/types';

import { ref } from 'vue';

import { defineStore } from 'pinia';

/**
 * Cross-page order-intent revision coordinator. WS `quant.intent` frames only
 * bump a revision counter + record the last event; pages re-fetch their lists.
 */
export const useOrderIntentStore = defineStore('qp-order-intent', () => {
  const revision = ref(0);
  const lastEvent = ref<IntentLifecycleEvent | null>(null);

  function bumpRevision(event: IntentLifecycleEvent) {
    lastEvent.value = event;
    revision.value += 1;
  }

  function $reset() {
    revision.value = 0;
    lastEvent.value = null;
  }

  return { $reset, bumpRevision, lastEvent, revision };
});
