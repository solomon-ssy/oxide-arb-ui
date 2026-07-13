import type { IsoDateTime } from './common';

export interface DecisionBoundaryEvidenceView {
  decision_at: IsoDateTime;
  knowledge_cutoff: IsoDateTime;
  per_source_cutoffs: Record<string, IsoDateTime>;
}

export interface FeatureCellEvidenceView {
  audit_fingerprint: string;
  data_quality: string;
  evidence_available_at: IsoDateTime | null;
  evidence_effective_at: IsoDateTime | null;
  evidence_reference: null | string;
  evidence_source_kind: null | string;
  feature_name: string;
  raw_value: null | string;
  reason: null | string;
  source_kind: string;
  staleness_ms: null | number;
  state: 'missing' | 'not_applicable' | 'observed' | 'substituted';
  value_kind: string;
}

export interface ModelInputEvidenceView {
  audit_fingerprint: string;
  encoded_column: string;
  encoded_value_bits: null | string;
  input_contract_hash: string;
  raw_input_name: string;
  raw_state: string;
  raw_value: null | string;
  training_input_hash: string;
  transform_hash: string;
}

export interface ModelRouteEvidenceView {
  input_contract_hash: string;
  model_family: string;
  model_run_id: string;
  model_version_id: string;
  training_input_hash: string;
  transform_hash: string;
}
