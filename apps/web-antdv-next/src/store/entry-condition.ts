import type { EntryConditionLifecycleEvent } from '@vben/types';

import { ref } from 'vue';

import { defineStore } from 'pinia';

/** REST refresh coordinator for lean `quant.condition` WebSocket hints. */
export const useEntryConditionStore = defineStore('qp-entry-condition', () => {
  const revision = ref(0);
  const lastEvent = ref<EntryConditionLifecycleEvent | null>(null);

  function bumpRevision(event: EntryConditionLifecycleEvent) {
    lastEvent.value = event;
    revision.value += 1;
  }

  function $reset() {
    revision.value = 0;
    lastEvent.value = null;
  }

  return { $reset, bumpRevision, lastEvent, revision };
});
