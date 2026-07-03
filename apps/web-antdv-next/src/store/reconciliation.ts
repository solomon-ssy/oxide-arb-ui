import type { ReconciliationLifecycleEvent } from '@vben/types';

import { ref } from 'vue';

import { defineStore } from 'pinia';

/**
 * Cross-page reconciliation revision coordinator. WS `quant.reconciliation`
 * frames only bump a revision counter + record the last event; the
 * reconciliation queue, recovery card, and execution-pipeline card re-fetch by
 * REST on any bump (WS never carries the ledger rows).
 */
export const useReconciliationStore = defineStore('qp-reconciliation', () => {
  const revision = ref(0);
  const lastEvent = ref<null | ReconciliationLifecycleEvent>(null);

  function bumpRevision(event: ReconciliationLifecycleEvent) {
    lastEvent.value = event;
    revision.value += 1;
  }

  function $reset() {
    revision.value = 0;
    lastEvent.value = null;
  }

  return { $reset, bumpRevision, lastEvent, revision };
});
