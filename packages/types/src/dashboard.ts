import type {
  EquitySnapshotView,
  ExposureBreakdown,
  LiveAccountView,
} from './account';
import type { IsoDateTime } from './common';
import type { DataQualitySnapshot } from './data-quality';
import type { QuantRecommendationView } from './quant-recommendation';
import type { QuantReportView } from './quant-report';
import type { RuntimeActivityView } from './runtime-activity';
import type { SystemControlPlaneStatus } from './system';

export type DashboardWindow = '7d' | '24h' | '30d';

export type DashboardReasonCode =
  | 'dependency_unavailable'
  | 'evidence_missing'
  | 'no_account_snapshot'
  | 'no_report'
  | 'no_samples'
  | 'snapshot_too_old'
  | 'timed_out';

export type DashboardSection<T> =
  | {
      observed_at: IsoDateTime;
      reason_code: DashboardReasonCode;
      state: 'stale';
      value: T;
    }
  | { observed_at: IsoDateTime; state: 'ready'; value: T }
  | { reason_code: DashboardReasonCode; state: 'unavailable' }
  | { state: 'forbidden' };

export type DashboardPrimaryAction =
  | 'resolve_reconciliation'
  | 'run_report'
  | 'view_blockers';

export interface DashboardAuthorityView {
  system: SystemControlPlaneStatus;
  primary_action: DashboardPrimaryAction;
  primary_action_enabled: boolean;
}

export interface DashboardAccountView {
  live: LiveAccountView;
  latest_equity: EquitySnapshotView | null;
}

export interface DashboardReportView {
  report: QuantReportView;
  recommendations: QuantRecommendationView[];
}

export interface DashboardLifecycleView {
  counts: Record<string, number>;
  total: number;
}

export interface DashboardExposureView {
  exposures: ExposureBreakdown;
  position_count: number;
}

export interface DashboardResearchReadinessView {
  required_history_days: number;
  observed_history_days: null | number;
  factor_gate_ready: boolean;
  model_gate_ready: boolean;
}

export interface DashboardDependencyCheck {
  name: string;
  ok: boolean;
  detail?: string;
}

export interface DashboardSubsystemHealthView {
  ready: boolean;
  checks: DashboardDependencyCheck[];
}

export interface DashboardRuntimeActivityView {
  total: number;
  running: number;
  attention: number;
  items: RuntimeActivityView[];
}

export interface DashboardReportRuntimeView {
  queued: number;
  running: number;
  failed: number;
  abandoned: number;
}

export interface DashboardExecutionRuntimeView {
  pending_intents: number;
  active_orders: number;
  ambiguous_orders: number;
  unresolved_reconciliations: number;
}

export interface DashboardDataPlaneView {
  quality: DataQualitySnapshot;
  degraded: boolean;
}

export type DashboardActionSeverity = 'critical' | 'info' | 'warning';

export type DashboardActionReasonCode =
  | 'basis_alert_unacknowledged'
  | 'kill_switch_not_closed'
  | 'market_data_degraded'
  | 'policy_revision_awaiting_activation'
  | 'report_run_failed'
  | 'unresolved_reconciliation';

export type DashboardActionOwner =
  | 'data'
  | 'governance'
  | 'operations'
  | 'research'
  | 'risk';

export interface DashboardActionItemView {
  id: string;
  severity: DashboardActionSeverity;
  reason_code: DashboardActionReasonCode;
  owner: DashboardActionOwner;
  observed_at: IsoDateTime;
  target_route: string;
}

export interface DashboardOverviewView {
  revision: string;
  generated_at: IsoDateTime;
  window: DashboardWindow;
  authority: DashboardSection<DashboardAuthorityView>;
  account: DashboardSection<DashboardAccountView>;
  equity_curve: DashboardSection<EquitySnapshotView[]>;
  latest_report: DashboardSection<DashboardReportView>;
  report_lifecycle: DashboardSection<DashboardLifecycleView>;
  exposures: DashboardSection<DashboardExposureView>;
  data_quality: DashboardSection<DataQualitySnapshot>;
  research_readiness: DashboardSection<DashboardResearchReadinessView>;
  subsystem_health: DashboardSection<DashboardSubsystemHealthView>;
  action_inbox: DashboardSection<DashboardActionItemView[]>;
  runtime_activity: DashboardSection<DashboardRuntimeActivityView>;
  report_runtime: DashboardSection<DashboardReportRuntimeView>;
  execution_runtime: DashboardSection<DashboardExecutionRuntimeView>;
  data_plane: DashboardSection<DashboardDataPlaneView>;
}
