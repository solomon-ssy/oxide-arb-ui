import type { ComputedRef } from 'vue';

import { computed } from 'vue';

import { useSystemStore } from '#/store';

/**
 * Compact string keys distilled from `system.status` so dashboard cards can
 * `watch` only the fields that should trigger a REST re-fetch, instead of
 * deep-watching the whole (high-frequency) status frame.
 */
export interface DashboardStatusRefreshKeys {
  /** Pipeline counters depend on phase + auto-execution / reconciliation rollup. */
  pipelineRefreshKey: ComputedRef<string>;
  /** Recovery depends on the full recovery rollup + kill-switch + runtime mode. */
  recoveryRefreshKey: ComputedRef<string>;
}

export function useDashboardStatusRefreshKey(): DashboardStatusRefreshKeys {
  const systemStore = useSystemStore();

  const pipelineRefreshKey = computed(() => {
    const status = systemStore.status;
    if (!status) {
      return '';
    }
    const recovery = status.execution_recovery;
    return [
      status.operational_phase.phase,
      recovery.auto_execution_blocked,
      recovery.unresolvable_count,
      recovery.next_steps.join(','),
    ].join('|');
  });

  const recoveryRefreshKey = computed(() => {
    const status = systemStore.status;
    if (!status) {
      return '';
    }
    const recovery = status.execution_recovery;
    const killSwitch = status.kill_switch;
    return [
      recovery.auto_execution_blocked,
      recovery.has_unresolvable_reconciliation,
      recovery.unresolvable_count,
      recovery.kill_switch_requires_ack,
      recovery.kill_switch_state,
      recovery.next_steps.join(','),
      killSwitch.state,
      killSwitch.requires_operator_ack,
      status.quant_runtime_mode,
    ].join('|');
  });

  return { pipelineRefreshKey, recoveryRefreshKey };
}
