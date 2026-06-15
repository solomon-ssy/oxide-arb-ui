import type {
  ControlFactorMaterializationRunView,
  MaterializationScheduleStatusView,
  SyncSnapshot,
} from '@vben/types';

import { computed, ref } from 'vue';

import { defineStore } from 'pinia';

import {
  isTerminalMaterializationRun,
  TERMINAL_MATERIALIZATION_RUN_STATUSES,
} from '#/shared/components/materialization-run';

/** Cap for the in-memory recent-run ring buffer (dashboard + replay page seed). */
const RECENT_RUNS_CAP = 20;

/**
 * Materialization ops state: scheduled cadence health, active runs (WS), and
 * recent run history (REST + WS merge). Fed by WS `materialization.run_update`,
 * authorized `sync` sections, and REST bootstrap.
 */
export const useReplayStore = defineStore('oxide-replay', () => {
  const activeRuns = ref(
    new Map<string, ControlFactorMaterializationRunView>(),
  );
  const schedules = ref<MaterializationScheduleStatusView[]>([]);
  const recentRuns = ref<ControlFactorMaterializationRunView[]>([]);

  function mergeRecentRun(run: ControlFactorMaterializationRunView) {
    const id = run.materialization_run_id;
    const idx = recentRuns.value.findIndex(
      (row) => row.materialization_run_id === id,
    );
    const merged =
      idx === -1
        ? [run, ...recentRuns.value]
        : recentRuns.value.toSpliced(idx, 1, run);
    recentRuns.value = merged.slice(0, RECENT_RUNS_CAP);
  }

  /**
   * Upsert a run from WS push. Returns `true` when a previously-active run
   * reached a terminal state (caller may refresh schedules / history).
   */
  function upsertRun(run: ControlFactorMaterializationRunView): boolean {
    const wasActive = activeRuns.value.has(run.materialization_run_id);
    const next = new Map(activeRuns.value);
    if (TERMINAL_MATERIALIZATION_RUN_STATUSES.has(run.status)) {
      next.delete(run.materialization_run_id);
    } else {
      next.set(run.materialization_run_id, run);
    }
    activeRuns.value = next;
    mergeRecentRun(run);
    return wasActive && isTerminalMaterializationRun(run.status);
  }

  function applySyncSnapshot(snapshot: SyncSnapshot) {
    if (snapshot.active_materialization_runs) {
      const next = new Map<string, ControlFactorMaterializationRunView>();
      for (const run of snapshot.active_materialization_runs) {
        if (!TERMINAL_MATERIALIZATION_RUN_STATUSES.has(run.status)) {
          next.set(run.materialization_run_id, run);
        }
        mergeRecentRun(run);
      }
      activeRuns.value = next;
    }
    if (snapshot.materialization_schedules) {
      schedules.value = snapshot.materialization_schedules;
    }
  }

  function setSchedules(next: MaterializationScheduleStatusView[]) {
    schedules.value = next;
  }

  function setRecentRuns(next: ControlFactorMaterializationRunView[]) {
    recentRuns.value = next.slice(0, RECENT_RUNS_CAP);
  }

  const queuedOrRunning = computed(() =>
    [...activeRuns.value.values()].filter(
      (run) => run.status === 'queued' || run.status === 'running',
    ),
  );

  /** Recent history with active runs removed to avoid duplicate dashboard rows. */
  const recentRunsExcludingActive = computed(() => {
    const activeIds = new Set(activeRuns.value.keys());
    return recentRuns.value.filter(
      (run) => !activeIds.has(run.materialization_run_id),
    );
  });

  function $reset() {
    activeRuns.value = new Map();
    schedules.value = [];
    recentRuns.value = [];
  }

  return {
    $reset,
    activeRuns,
    applySyncSnapshot,
    queuedOrRunning,
    recentRuns,
    recentRunsExcludingActive,
    schedules,
    setRecentRuns,
    setSchedules,
    upsertRun,
  };
});
