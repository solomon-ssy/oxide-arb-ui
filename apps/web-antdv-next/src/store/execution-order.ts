import type { ExecutionOrderLifecycleEvent } from '@vben/types';

import { ref } from 'vue';

import { defineStore } from 'pinia';

/** REST invalidation coordinator for committed `quant.execution_order` frames. */
export const useExecutionOrderStore = defineStore('qp-execution-order', () => {
  const revision = ref(0);
  const lastEvent = ref<ExecutionOrderLifecycleEvent | null>(null);

  function bumpRevision(event: ExecutionOrderLifecycleEvent) {
    lastEvent.value = event;
    revision.value += 1;
  }

  function invalidate() {
    lastEvent.value = null;
    revision.value += 1;
  }

  function $reset() {
    revision.value = 0;
    lastEvent.value = null;
  }

  return { $reset, bumpRevision, invalidate, lastEvent, revision };
});
