import type { IsoDateTime, PageQuery, Paginated } from './common';
import type { CalibrationKind, MarketCategory, ModelFamily } from './enums';
import type { FeedbackEvaluationUseView } from './feedback';
import type {
  ClassicalKind,
  FactorServingPlane,
  TrainedModelView,
} from './research';
import type { ResearchProfileRef } from './research-profile';

export interface ModelServingCalibrationRef {
  artifact_id: string;
  kind: CalibrationKind;
  content_hash: string;
}

export type ModelServingIntrinsicInputKind =
  | 'position_peak_drawdown'
  | 'position_stop_loss_pressure'
  | 'position_take_profit_pressure'
  | 'position_time_in_trade';

export type ModelServingEstimatorInput =
  | {
      binding: {
        definition_hash: string;
        kind: ModelServingIntrinsicInputKind;
        semantic_version: number;
      };
      input_kind: 'model_intrinsic';
    }
  | {
      factor_definition_id: string;
      input_kind: 'governed_factor';
    };

export type ModelServingEstimator =
  | {
      estimator_kind: 'classical';
      kind: ClassicalKind;
      model_payload_hash: string;
      serialization_format: 'bincode' | 'json';
      serialized_model_hash: string;
    }
  | {
      estimator_kind: 'factor_native';
      model_payload_hash: string;
      ordered_inputs: ModelServingEstimatorInput[];
    };

export interface ModelServingProfileArtifactRef {
  profile_artifact_id: string;
  kind: 'domain' | 'feature' | 'research_method' | 'scoring';
  content_hash: string;
}

export interface ModelServingProfileArtifacts {
  features: ModelServingProfileArtifactRef;
  scoring: ModelServingProfileArtifactRef;
  domain: ModelServingProfileArtifactRef;
  research_method: ModelServingProfileArtifactRef;
}

export interface ModelServingContractView {
  contract_version: number;
  contract_hash: string;
  bindings: {
    capability_registry_hashes: string[];
    dataset: {
      artifact_bytes_hash: string;
      /** Canonical manifest bytes are audited through `manifest_hash`, not reinterpreted here. */
      manifest: unknown;
      manifest_hash: string;
    };
    factors: {
      bias_table: ModelServingCalibrationRef | null;
      plane: FactorServingPlane;
    };
    model: {
      calibration: ModelServingCalibrationRef | null;
      category_scope: MarketCategory | null;
      estimator: ModelServingEstimator;
      model_family: ModelFamily;
      model_spec_definition_hash: string;
      model_spec_id: string;
      model_version_id: string;
      prediction_horizon_secs: number;
      profile_ref: ResearchProfileRef;
    };
    policy_snapshot: {
      decision_policy_snapshot_id: string;
      profile_artifacts: ModelServingProfileArtifacts;
      snapshot_hash: string;
    };
    required_domain_families: Array<'crypto' | 'weather'>;
    schemas: {
      feature_schema_hash: string;
      label_schema_hash: string;
    };
    trade_policy: null | {
      artifact_id: string;
      content_hash: string;
    };
    transform: {
      input_contract_hash: string;
      input_transform_hash: string;
      training_dataset_hash: string;
      training_input_hash: string;
    };
  };
}

export type ModelVersionDerivationView =
  | {
      calibration_artifact_id: string;
      kind: 'return_calibration';
      parent_model_version_id: string;
    }
  | { kind: 'training' };

export type ModelPromotionRole = 'candidate' | 'champion';

export interface ModelPromotionLineageView {
  audit_id: string;
  audit_event_id: string;
  promotion_permit_id: string;
  promotion_transaction_hash: string;
  feedback_cycle_id: string;
  role: ModelPromotionRole;
  actor_username: string;
  actor_role: null | string;
  reason: string;
  record: unknown;
  created_at: IsoDateTime;
}

/** Full GET model detail; list summaries remain `TrainedModelView`. */
export interface ModelDetailView extends TrainedModelView {
  serving_contract: ModelServingContractView;
  serving_contract_hash: string;
  derivation: ModelVersionDerivationView;
  evaluation_lineage: Paginated<FeedbackEvaluationUseView>;
  promotion_lineage: ModelPromotionLineageView[];
}

export type ModelDetailQuery = PageQuery;
