import type {
  ReportLifecycleEvent,
  ReportRunLifecycleEvent,
} from '@vben/types';

import { ref } from 'vue';

import { defineStore } from 'pinia';

/**
 * Cross-page report revision coordinator. WS `quant.report` frames only bump a
 * revision counter + record the last event; pages re-fetch their own lists.
 */
export const useQuantReportStore = defineStore('qp-quant-report', () => {
  const revision = ref(0);
  const runRevision = ref(0);
  const lastEvent = ref<null | ReportLifecycleEvent>(null);
  const lastRunEvent = ref<null | ReportRunLifecycleEvent>(null);

  function bumpRevision(event: ReportLifecycleEvent) {
    lastEvent.value = event;
    revision.value += 1;
  }

  function bumpRunRevision(event: ReportRunLifecycleEvent) {
    lastRunEvent.value = event;
    runRevision.value += 1;
  }

  function invalidate() {
    lastEvent.value = null;
    lastRunEvent.value = null;
    revision.value += 1;
    runRevision.value += 1;
  }

  function $reset() {
    revision.value = 0;
    lastEvent.value = null;
    lastRunEvent.value = null;
    runRevision.value = 0;
  }

  return {
    $reset,
    bumpRevision,
    bumpRunRevision,
    invalidate,
    lastEvent,
    lastRunEvent,
    revision,
    runRevision,
  };
});
