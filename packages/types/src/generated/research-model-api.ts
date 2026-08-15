/**
 * This file is generated from the Rust research-model API DTO contract.
 * Run `pnpm generate:research-model-api`; do not edit it by hand.
 */

/**
 * A monotonic schema version for feature / factor / label / config schemas.
 *
 * Wrapping the version prevents accidentally mixing it with unrelated integers
 * (counts, ids, ordinals) and makes "which schema generated this row" explicit
 * in every signature. Versions are `>= 1` by convention; untrusted wire and DB
 * values are validated through [`SchemaVersion::try_new`].
 */
export type SchemaVersion = number;
/**
 * Supported feature families for v3 feature generation.
 *
 * One family ≈ one feature-builder group. The set gates which groups the
 * feature plane computes (`features.enabled_feature_families`) and tags each
 * `FeatureSpec` in the research schema registry, so config and the compute
 * schema share a single, precise taxonomy.
 */
export type FeatureFamily =
  | 'domain'
  | 'market_metadata'
  | 'microstructure'
  | 'price_book'
  | 'structural'
  | 'time_series'
  | 'trade';
/**
 * The dimensional kind of a present feature value.
 *
 * Carries a stable `i8` code persisted to `quant_feature_event.value_kind`.
 * Append-only contract: never renumber an existing variant.
 */
export type FeatureValueKind =
  | 'bool'
  | 'bps'
  | 'category'
  | 'count'
  | 'decimal'
  | 'probability'
  | 'usd';
export type ModelFamily =
  | (
      | 'classical_elastic_net'
      | 'classical_extra_trees'
      | 'classical_gradient_boosted_trees'
      | 'classical_lasso'
      | 'classical_logistic_regression'
      | 'classical_random_forest'
      | 'classical_ridge'
      | 'weighted_factor'
    )
  | 'hold_vs_exit_weighted';

/**
 * Schema-only envelope used to generate frontend types and runtime decoders.
 *
 * HTTP handlers never serialize this envelope. Its only purpose is to keep
 * model authoring, frozen model-spec reads, and CPCV submission reachable from
 * one Rust-owned schema root so the SPA cannot maintain parallel wire types.
 */
export interface ResearchModelApiContractSchema {
  create_model_spec_request: CreateModelSpecRequest;
  feature_contract_response: FeatureContractView;
  model_spec_response: QuantModelSpecView;
  run_cpcv_backtest_request: RunCpcvBacktestRequest;
}
/**
 * Inbound body for `POST /research/model-specs`.
 *
 * A model spec is the **authoring root** of the offline research lifecycle:
 * the operator declares the model family, prediction horizon, and feature /
 * label schema versions the downstream dataset build and training runs bind
 * to. A spec and every trained model version are immutable; serving role is
 * derived only from a governed route generation.
 *
 * `model_family` deserializes from its canonical wire label (`"weighted_factor"`,
 * `"classical_random_forest"`, `"hold_vs_exit_weighted"`, …); an unknown label
 * is rejected at the boundary with `400`.
 */
export interface CreateModelSpecRequest {
  /**
   * Feature schema version the spec targets (defaults to the first version).
   */
  feature_schema_version?: number;
  input_contract: ModelInputContract;
  /**
   * Label schema version the spec targets (defaults to the first version).
   */
  label_schema_version?: number;
  /**
   * Model family this spec authors (Buy ranker, Sell/exit scorer, classical).
   */
  model_family:
    | (
        | 'classical_elastic_net'
        | 'classical_extra_trees'
        | 'classical_gradient_boosted_trees'
        | 'classical_lasso'
        | 'classical_logistic_regression'
        | 'classical_random_forest'
        | 'classical_ridge'
        | 'weighted_factor'
      )
    | 'hold_vs_exit_weighted';
  /**
   * Human-facing spec name (unique-ish label shown in the catalog picker).
   */
  name: string;
  /**
   * Model-intrinsic prediction horizon in seconds (`>= 1`).
   */
  prediction_horizon_secs: number;
  /**
   * Operator reason recorded on the operation log (UI should require non-empty).
   */
  reason: string;
  thesis: ModelSpecThesis;
  training_contract: ModelTrainingContract;
}
/**
 * Ordered raw-input contract. This field is mandatory: an empty contract,
 * unknown feature, duplicate, or encoded/synthetic name is rejected.
 */
export interface ModelInputContract {
  inputs: ModelInputSpec[];
}
/**
 * One ordered raw feature consumed by a model.
 */
export interface ModelInputSpec {
  /**
   * Stable feature name from the governed feature catalog.
   */
  feature_name: string;
  /**
   * Model-level availability requirement.
   */
  requiredness: 'optional' | 'required';
}
/**
 * Closed, human-authored research thesis. This cannot carry executable
 * parameters or arbitrary metadata keys.
 */
export interface ModelSpecThesis {
  /**
   * Falsifiable relationship the research line is expected to demonstrate.
   */
  hypothesis: string;
  /**
   * Known boundaries that must be considered when evaluating a trained version.
   */
  limitations: string[];
  /**
   * Concise catalog summary for operators.
   */
  summary: string;
}
/**
 * Frozen typed target, evaluation-policy binding, and CV folds.
 * Training cannot override these semantics.
 */
export interface ModelTrainingContract {
  /**
   * Published policy used only for OOS executable evaluation and Route
   * readiness. It does not generate or redefine the supervised target.
   */
  evaluation_trade_policy_artifact_id?: null | string;
  /**
   * Closed task whose exact label name and horizon are derived, never typed
   * as an arbitrary string by an operator.
   */
  target:
    | {
        /**
         * Exact forward-label horizon in seconds.
         */
        horizon_secs: number;
        kind: 'forward_return';
      }
    | {
        kind: 'hold_vs_exit_alpha';
      }
    | {
        kind: 'outcome_payout';
      };
  /**
   * Rolling validation fold count. Every fold fits its own transform.
   */
  validation_folds: number;
}
/**
 * Active, hash-bound feature catalog used by model-spec authoring.
 */
export interface FeatureContractView {
  feature_schema_hash: string;
  feature_schema_version: SchemaVersion;
  features: FeatureContractEntryView[];
}
/**
 * One raw feature available to model input contracts.
 */
export interface FeatureContractEntryView {
  compute_revision: number;
  family: FeatureFamily;
  name: string;
  null_policy: FeatureNullPolicyView;
  point_in_time_rule: string;
  source: string;
  staleness_policy: string;
  unit: string;
  value_kind: FeatureValueKind;
}
/**
 * Stable wire projection of one feature's missing-value policy.
 */
export interface FeatureNullPolicyView {
  /**
   * Policy name (`reject_market`, `neutral_value`, `penalize`, `optional`).
   */
  policy: string;
  /**
   * Exact decimal neutral value when `policy = neutral_value`.
   */
  value?: null | string;
}
/**
 * Outbound projection for a model specification row (the training entry point:
 * the operator picks a spec before planning a dataset or training a version).
 */
export interface QuantModelSpecView {
  created_at: string;
  created_by_label: string;
  created_by_role?: null | string;
  created_by_user_id?: null | string;
  definition_hash: string;
  feature_schema_version: SchemaVersion;
  input_contract: ModelInputContract1;
  label_schema_version: SchemaVersion;
  model_family: ModelFamily;
  model_spec_id: string;
  name: string;
  prediction_horizon_secs: number;
  reason: string;
  thesis: ModelSpecThesis1;
  training_contract: ModelTrainingContract1;
}
/**
 * Frozen ordered raw-input graph for one model specification.
 *
 * Encoded/synthetic columns are intentionally absent: they are derived only by
 * the fitted transform and can never enter this source contract.
 */
export interface ModelInputContract1 {
  inputs: ModelInputSpec[];
}
/**
 * Human-authored research thesis that cannot be inferred from executable fields.
 *
 * This is intentionally a closed document rather than a free-form metadata map.
 * It is read and written atomically with the immutable model spec, never queried
 * by individual JSON keys, and therefore uses typed JSONB through
 * [`FromJsonQueryResult`]. Executable inputs, targets, horizons, and lifecycle
 * state do not belong here.
 */
export interface ModelSpecThesis1 {
  /**
   * Falsifiable relationship the research line is expected to demonstrate.
   */
  hypothesis: string;
  /**
   * Known boundaries that must be considered when evaluating a trained version.
   */
  limitations: string[];
  /**
   * Concise catalog summary for operators.
   */
  summary: string;
}
/**
 * Frozen supervised-target and cross-validation policy owned by a model spec.
 * Training requests cannot override these fields.
 */
export interface ModelTrainingContract1 {
  /**
   * Published policy used only for OOS executable evaluation and Route
   * readiness. It does not generate or redefine the supervised target.
   */
  evaluation_trade_policy_artifact_id?: null | string;
  /**
   * Closed task whose exact label name and horizon are derived, never typed
   * as an arbitrary string by an operator.
   */
  target:
    | {
        /**
         * Exact forward-label horizon in seconds.
         */
        horizon_secs: number;
        kind: 'forward_return';
      }
    | {
        kind: 'hold_vs_exit_alpha';
      }
    | {
        kind: 'outcome_payout';
      };
  /**
   * Rolling validation fold count. Every fold fits its own transform.
   */
  validation_folds: number;
}
/**
 * Inbound body for `POST /research/models/{id}/cpcv-backtest` (the model
 * version id is taken from the path).
 *
 * `Serialize` is derived so the request can be frozen into a durable
 * research job's `params_json` and replayed on execute.
 *
 * Model family, input contract, supervised target, and prediction horizon are
 * deliberately absent: the server resolves them from the model version's
 * linked dataset and immutable model specification.
 */
export interface RunCpcvBacktestRequest {
  /**
   * Frozen runtime-config version governing `research.validation.*` (CPCV
   * partitions, purge/embargo, trial grid, PBO block count, gate
   * thresholds) + portfolio caps + provenance.
   */
  decision_policy_snapshot_id: string;
  /**
   * Pre-assigned path-set id frozen at async enqueue for effectively-once
   * recovery; omit on direct calls — the job engine mints one before
   * persisting params.
   */
  path_set_id?: null | string;
  /**
   * Operator reason recorded on the operation log.
   */
  reason: string;
  /**
   * Frozen, PIT-materialized dataset the model version was trained on.
   */
  training_dataset_id: string;
}
