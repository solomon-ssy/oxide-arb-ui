import type {
  DecimalString,
  IsoDateTime,
  PriceString,
  UuidString,
} from './common';
import type { OutcomeSide, PriceComparison } from './enums';

export type EntryConditionState =
  | 'confirming'
  | 'consumed'
  | 'expired'
  | 'invalidated'
  | 'not_required'
  | 'qualified'
  | 'unavailable'
  | 'waiting';

export type EntryConditionAuditAction =
  | 'claimed'
  | 'created'
  | 'evaluated'
  | 'expired'
  | 'invalidated'
  | 'lease_taken_over'
  | 'reverted';

export type ConditionUnavailableReason =
  | { generation: number; kind: 'source_gap'; source_id: string }
  | { kind: 'artifact_hash_mismatch' }
  | { kind: 'binding_drift' }
  | { kind: 'catalog_snapshot_mismatch' }
  | { kind: 'clock_skew' }
  | { kind: 'factor_definition_mismatch' }
  | { kind: 'input_missing' }
  | { kind: 'input_stale' }
  | { kind: 'market_linkage_mismatch' }
  | { kind: 'source_not_configured'; source_id: string }
  | { kind: 'source_unhealthy'; source_id: string };

export type ConditionTruth =
  | { kind: 'satisfied' }
  | { kind: 'unavailable'; reason: ConditionUnavailableReason }
  | { kind: 'unsatisfied' };

export interface EntryConditionSourceBinding {
  binding_hash: string;
  instrument_key: string;
  source_id: string;
}

export interface TemperatureBand {
  lower_inclusive: DecimalString | null;
  upper_inclusive: DecimalString | null;
}

export type EntryConditionNodeV1 =
  | {
      anchor: 'market_end' | 'market_start' | 'recommendation_decision';
      anchor_at: IsoDateTime;
      deadline_at: IsoDateTime;
      kind: 'clock';
      offset_ms: number;
    }
  | {
      children: EntryConditionNodeV1[];
      kind: 'all' | 'any';
    }
  | {
      comparison: PriceComparison;
      definition_hash: string;
      definition_id: UuidString;
      kind: 'factor';
      max_input_age_ms: number;
      measure: 'normalized' | 'raw';
      minimum_confidence: DecimalString;
      model_version_id: UuidString;
      threshold: DecimalString;
    }
  | {
      comparison: PriceComparison;
      kind: 'price';
      max_input_age_ms: number;
      threshold: PriceString;
      token_id: string;
    }
  | {
      event: MarketEventCondition;
      kind: 'market_event';
    };

export type MarketEventCondition =
  | (Record<string, unknown> & { kind: 'crypto_subject_predicate_entered' })
  | (Record<string, unknown> & {
      kind: 'weather_daily_temperature_crossed_terminal_bound';
    })
  | (Record<string, unknown> & {
      kind: 'weather_daily_temperature_entered_band';
    })
  | (Record<string, unknown> & {
      kind: 'weather_observation_day_closed_outside_band';
    });

export interface EntryConditionArtifactV1 {
  binding: {
    catalog_snapshot_hash: string;
    catalog_snapshot_id: UuidString;
    decision_policy_snapshot_id: UuidString;
    factor_bindings: Array<{
      definition_hash: string;
      definition_id: UuidString;
    }>;
    market_id: string;
    market_linkage_hash: null | string;
    market_linkage_id: null | UuidString;
    model_version_id: UuidString;
    outcome_side: OutcomeSide;
    recommendation_id: UuidString;
    source_bindings: EntryConditionSourceBinding[];
    token_id: string;
  };
  confirmation: {
    max_observation_gap_ms: number;
    required_continuous_ms: number;
  };
  evaluator_version: number;
  root: EntryConditionNodeV1;
  schema_version: number;
}

export type EntryConditionPlan =
  | { artifact_id: UuidString; content_hash: string; kind: 'conditional' }
  | { kind: 'immediate' };

export interface EntryConditionInstanceSummaryView {
  artifact_hash: null | string;
  artifact_id: null | UuidString;
  claim_admission_state_version: null | string;
  claimed_by_intent_id: null | UuidString;
  condition_instance_id: UuidString;
  confirmation_started_at: IsoDateTime | null;
  consumed_at: IsoDateTime | null;
  continuity_hash: null | string;
  evaluation_hash: null | string;
  expires_at: IsoDateTime;
  input_fingerprint: null | string;
  last_evaluated_at: IsoDateTime | null;
  lease_epoch: number;
  next_evaluation_at: IsoDateTime | null;
  revision: number;
  state: EntryConditionState;
  truth: ConditionTruth | null;
}

export interface EntryConditionArtifactView {
  artifact: EntryConditionArtifactV1;
  artifact_id: UuidString;
  content_hash: string;
  evaluator_version: number;
  nodes: Array<{ node_id: number; subtree_hash: string }>;
  schema_version: number;
}

export interface EntryConditionDetailView {
  artifact: EntryConditionArtifactView | null;
  instance: EntryConditionInstanceSummaryView;
  latest_authoritative_evaluation: EntryConditionEvaluationView | null;
}

export interface EntryConditionLeafEvidenceView {
  available_at: IsoDateTime | null;
  evidence: Record<string, unknown>;
  freshness_ms: null | number;
  node_id: number;
  observed_at: IsoDateTime | null;
  source_checkpoint: null | Record<string, unknown>;
  truth: ConditionTruth;
  unavailable_reason: ConditionUnavailableReason | null;
}

export interface EntryConditionEvaluationView {
  applied_revision: number;
  continuity_hash: string;
  evaluated_at: IsoDateTime;
  evaluation_hash: string;
  evaluation_id: string;
  evaluator_version: number;
  input_fingerprint: string;
  leaf_evidence: EntryConditionLeafEvidenceView[];
  state: EntryConditionState;
  tree: EntryConditionNodeEvaluationView;
  truth: 'satisfied' | 'unavailable' | 'unsatisfied';
}

export interface EntryConditionNodeEvaluationView {
  children: EntryConditionNodeEvaluationView[];
  decisive_child_id: null | number;
  evidence: null | Record<string, unknown>;
  node_id: number;
  truth: ConditionTruth;
}

export interface EntryConditionAuditView {
  action: EntryConditionAuditAction;
  audit_id: UuidString;
  condition_instance_id: UuidString;
  continuity_hash: null | string;
  detail: null | string;
  evaluation_hash: null | string;
  from_state: EntryConditionState | null;
  input_fingerprint: null | string;
  lease_epoch: number;
  occurred_at: IsoDateTime;
  revision: number;
  to_state: EntryConditionState;
  truth: ConditionTruth | null;
}
