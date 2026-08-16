import type { UuidString } from './common';
import type {
  DecisionBoundaryEvidenceView,
  FeatureCellEvidenceView,
  ModelInputEvidenceView,
} from './decision-evidence';

/** `GET /quant/recommendations/{id}/evidence` replay-handle references. */
export interface QuantEvidenceView {
  recommendation_id: UuidString;
  signal_candidate_id: string;
  feature_vector_id: string;
  model_run_id: string;
  market_selection_id: string;
  book_snapshot_ref: string;
  decision_policy_snapshot_id: string;
  model_version_id: string;
  factor_definition_versions: string[];
  data_quality_snapshot_ref: string;
  decision_boundary: DecisionBoundaryEvidenceView | null;
  evidence_complete: boolean;
  feature_cells: FeatureCellEvidenceView[];
  feature_hash: null | string;
  feature_schema_hash: null | string;
  model_inputs: ModelInputEvidenceView[];
}
