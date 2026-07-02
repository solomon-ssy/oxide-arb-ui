import type { ReportLifecycleEvent } from '@vben/types';

import { ref } from 'vue';

import { defineStore } from 'pinia';

/**
 * Cross-page report revision coordinator. WS `quant.report` frames only bump a
 * revision counter + record the last event; pages re-fetch their own lists.
 */
export const useQuantReportStore = defineStore('qp-quant-report', () => {
  const revision = ref(0);
  const lastEvent = ref<null | ReportLifecycleEvent>(null);

  function bumpRevision(event: ReportLifecycleEvent) {
    lastEvent.value = event;
    revision.value += 1;
  }

  function $reset() {
    revision.value = 0;
    lastEvent.value = null;
  }

  return { $reset, bumpRevision, lastEvent, revision };
});
