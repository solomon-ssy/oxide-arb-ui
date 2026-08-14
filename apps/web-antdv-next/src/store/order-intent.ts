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
  /** Intent ids whose next WS echo should not toast (local governed action). */
  const wsToastSuppressedIntentIds = ref(new Set<string>());

  function bumpRevision(event: IntentLifecycleEvent) {
    lastEvent.value = event;
    revision.value += 1;
  }

  function invalidate() {
    lastEvent.value = null;
    revision.value += 1;
  }

  /**
   * Suppress the lifecycle toast for the next `quant.intent` frame matching
   * `intentId` — called after a successful local governed mutation so the
   * operator is not notified twice (action feedback + WS echo).
   */
  function suppressWsToastForIntent(intentId: string) {
    wsToastSuppressedIntentIds.value.add(intentId);
  }

  /** Whether a WS lifecycle frame should surface a list toast on this client. */
  function shouldShowWsToast(event: IntentLifecycleEvent): boolean {
    if (!wsToastSuppressedIntentIds.value.has(event.order_intent_id)) {
      return true;
    }
    wsToastSuppressedIntentIds.value.delete(event.order_intent_id);
    return false;
  }

  function $reset() {
    revision.value = 0;
    lastEvent.value = null;
    wsToastSuppressedIntentIds.value.clear();
  }

  return {
    $reset,
    bumpRevision,
    invalidate,
    lastEvent,
    revision,
    shouldShowWsToast,
    suppressWsToastForIntent,
  };
});
