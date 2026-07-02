import type { MaterializationRunEvent } from '@vben/types';

import { ref } from 'vue';

import { defineStore } from 'pinia';

/**
 * Cross-page research revision coordinator. WS `materialization.run_update`
 * frames only bump a revision counter + record the last run event; the
 * workbench re-fetches by id (no dataset/model catalog lives here).
 */
export const useResearchStore = defineStore('qp-research', () => {
  const revision = ref(0);
  const lastRunEvent = ref<MaterializationRunEvent | null>(null);

  function bumpRevision(event: MaterializationRunEvent) {
    lastRunEvent.value = event;
    revision.value += 1;
  }

  function $reset() {
    revision.value = 0;
    lastRunEvent.value = null;
  }

  return { $reset, bumpRevision, lastRunEvent, revision };
});
