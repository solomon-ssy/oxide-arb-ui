import type { IsoDateTime, UuidString } from './common';
import type {
  ControlFactorType,
  EvidenceStageStatus,
  MaterializationOutputPolicy,
  MaterializationRunKind,
  MaterializationRunStatus,
  MaterializationStageName,
  RunTriggerType,
} from './enums';

/** Outbound view of a materialization / replay run (`GET /replay`, WS push). */
export interface ControlFactorMaterializationRunView {
  materialization_run_id: UuidString;
  run_dedupe_key: null | string;
  run_kind: MaterializationRunKind;
  trigger_type: RunTriggerType;
  trigger_ref: null | string;
  status: MaterializationRunStatus;
  window_from: IsoDateTime;
  window_to: IsoDateTime;
  source_delay_secs: number;
  market_filter: unknown;
  requested_factor_types: ControlFactorType[] | unknown;
  output_policy: MaterializationOutputPolicy;
  report: unknown;
  created_by: string;
  started_at: IsoDateTime | null;
  finished_at: IsoDateTime | null;
  failure_code: null | string;
  failure_detail: null | string;
  report_uri: null | string;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

/** Outbound view of a single per-stage report for a run. */
export interface ControlFactorStageReportView {
  stage_report_id: UuidString;
  materialization_run_id: UuidString;
  stage_name: MaterializationStageName;
  status: EvidenceStageStatus;
  started_at: IsoDateTime;
  finished_at: IsoDateTime | null;
  coverage: unknown;
  metrics: unknown;
  records_read: number;
  records_written: number;
  warnings: unknown;
  errors: unknown;
  created_at: IsoDateTime;
}

/** Response for a replay enqueue (`POST /replay`). */
export interface ReplayEnqueueView {
  created: boolean;
  run: ControlFactorMaterializationRunView;
}
