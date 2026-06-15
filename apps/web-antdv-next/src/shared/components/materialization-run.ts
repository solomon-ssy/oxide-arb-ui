import type {
  MaterializationRunKind,
  MaterializationRunStatus,
} from '@vben/types';

/** Tag colors for materialization run lifecycle statuses. */
export const MATERIALIZATION_RUN_STATUS_COLOR: Record<
  MaterializationRunStatus,
  string
> = {
  cancelled: 'default',
  completed: 'success',
  completed_with_rejected_factors: 'warning',
  failed: 'error',
  queued: 'default',
  report_only: 'processing',
  running: 'processing',
};

/** Tag colors for materialization run kinds. */
export const MATERIALIZATION_RUN_KIND_COLOR: Record<
  MaterializationRunKind,
  string
> = {
  backfill: 'blue',
  config_comparison: 'purple',
  forensic_report: 'default',
  incident: 'red',
  scheduled: 'cyan',
};

/** Terminal run statuses (evicted from the live active map). */
export const TERMINAL_MATERIALIZATION_RUN_STATUSES: ReadonlySet<MaterializationRunStatus> =
  new Set([
    'cancelled',
    'completed',
    'completed_with_rejected_factors',
    'failed',
    'report_only',
  ]);

/** Whether a run has reached a terminal lifecycle state. */
export function isTerminalMaterializationRun(
  status: MaterializationRunStatus,
): boolean {
  return TERMINAL_MATERIALIZATION_RUN_STATUSES.has(status);
}
