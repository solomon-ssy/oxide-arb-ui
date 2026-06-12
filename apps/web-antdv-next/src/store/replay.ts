import type {
  ControlFactorMaterializationRunView,
  MaterializationRunStatus,
  SyncSnapshot,
} from '@vben/types';

import { computed, ref } from 'vue';

import { defineStore } from 'pinia';

/** Terminal run statuses evicted from the live dashboard map. */
const TERMINAL_RUN_STATUSES: ReadonlySet<MaterializationRunStatus> = new Set([
  'cancelled',
  'completed',
  'completed_with_rejected_factors',
  'failed',
  'report_only',
]);

/**
 * Active materialization / replay runs, fed by WS `materialization.run_update`
 * and the authorized `sync.active_materialization_runs` section.
 */
export const useReplayStore = defineStore('oxide-replay', () => {
  const activeRuns = ref(
    new Map<string, ControlFactorMaterializationRunView>(),
  );

  function upsertRun(run: ControlFactorMaterializationRunView) {
    const next = new Map(activeRuns.value);
    if (TERMINAL_RUN_STATUSES.has(run.status)) {
      next.delete(run.materialization_run_id);
    } else {
      next.set(run.materialization_run_id, run);
    }
    activeRuns.value = next;
  }

  function applySyncSnapshot(snapshot: SyncSnapshot) {
    if (!snapshot.active_materialization_runs) {
      return;
    }
    const next = new Map<string, ControlFactorMaterializationRunView>();
    for (const run of snapshot.active_materialization_runs) {
      if (!TERMINAL_RUN_STATUSES.has(run.status)) {
        next.set(run.materialization_run_id, run);
      }
    }
    activeRuns.value = next;
  }

  const queuedOrRunning = computed(() =>
    [...activeRuns.value.values()].filter(
      (run) => run.status === 'queued' || run.status === 'running',
    ),
  );

  function $reset() {
    activeRuns.value = new Map();
  }

  return {
    $reset,
    activeRuns,
    applySyncSnapshot,
    queuedOrRunning,
    upsertRun,
  };
});
