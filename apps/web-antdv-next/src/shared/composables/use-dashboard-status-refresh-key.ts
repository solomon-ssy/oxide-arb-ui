import type { ComputedRef } from 'vue';

import { computed } from 'vue';

import { useSystemStore } from '#/store';

/**
 * Compact string keys distilled from `system.status` so dashboard cards can
 * `watch` only the fields that should trigger a REST re-fetch, instead of
 * deep-watching the whole (high-frequency) status frame.
 */
export interface DashboardStatusRefreshKeys {
  /**
   * Command-center overview REST re-fetch. Intentionally omits heartbeat
   * fields (`checked_at`, `uptime_secs`, `last_message_age_ms`, live market
   * counts) — those change every WS/status frame and would otherwise loop
   * `loadOverview` → MotionGroup re-enter → visible flicker.
   */
  overviewRefreshKey: ComputedRef<string>;
  /** Pipeline counters depend on phase + entry authorization / reconciliation rollup. */
  pipelineRefreshKey: ComputedRef<string>;
  /** Recovery depends on the full recovery rollup + kill-switch + runtime-control revision. */
  recoveryRefreshKey: ComputedRef<string>;
}

export function useDashboardStatusRefreshKey(): DashboardStatusRefreshKeys {
  const systemStore = useSystemStore();

  const overviewRefreshKey = computed(() => {
    const status = systemStore.status;
    if (!status) {
      return '';
    }
    const killSwitch = status.kill_switch;
    return [
      status.entry_authorization_policy,
      status.operational_phase.phase,
      killSwitch.state,
      killSwitch.requires_operator_ack,
      status.catalog.state,
      systemStore.controlPlane?.capabilities.revision ?? '',
    ].join('|');
  });

  const pipelineRefreshKey = computed(() => {
    const status = systemStore.status;
    if (!status) {
      return '';
    }
    const recovery = status.execution_recovery;
    return [
      status.operational_phase.phase,
      recovery.policy_automatic_blocked,
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
      recovery.policy_automatic_blocked,
      recovery.has_unresolvable_reconciliation,
      recovery.unresolvable_count,
      recovery.kill_switch_requires_ack,
      recovery.kill_switch_state,
      recovery.next_steps.join(','),
      killSwitch.state,
      killSwitch.requires_operator_ack,
      status.entry_authorization_policy,
    ].join('|');
  });

  return { overviewRefreshKey, pipelineRefreshKey, recoveryRefreshKey };
}
