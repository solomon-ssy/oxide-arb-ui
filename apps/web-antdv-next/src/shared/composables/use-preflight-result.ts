import type { PreflightReport } from '@vben/types';

import { ref } from 'vue';

const preflightReport = ref<null | PreflightReport>(null);
const preflightOpen = ref(false);

/** Session-scoped preflight evidence drawer (mode switch success). */
export function usePreflightResult() {
  function show(report: PreflightReport) {
    preflightReport.value = report;
    preflightOpen.value = true;
  }

  function close() {
    preflightOpen.value = false;
  }

  return { close, preflightOpen, preflightReport, show };
}
