import type { QuantModelSpecView, RunCpcvBacktestRequest } from '@vben/types';

export type CpcvRequestBody = Pick<
  RunCpcvBacktestRequest,
  'decision_policy_snapshot_id' | 'training_dataset_id'
>;

type CpcvContractSource = Pick<
  QuantModelSpecView,
  | 'input_contract'
  | 'model_family'
  | 'prediction_horizon_secs'
  | 'training_contract'
>;

/** Read-only projection of the server-owned CPCV training semantics. */
export interface CpcvFrozenContract {
  modelFamily: string;
  predictionHorizonSecs: number;
  rawInputCount: number;
  targetLabelHorizonSecs: number;
  targetLabelName: string;
  validationFolds: number;
}

/** Project the immutable model spec without family-specific UI defaults. */
export function cpcvFrozenContractFromSpec(
  spec: CpcvContractSource,
): CpcvFrozenContract {
  return {
    modelFamily: spec.model_family,
    predictionHorizonSecs: spec.prediction_horizon_secs,
    rawInputCount: spec.input_contract.inputs.length,
    targetLabelHorizonSecs: spec.training_contract.target_label_horizon_secs,
    targetLabelName: spec.training_contract.target_label_name,
    validationFolds: spec.training_contract.validation_folds,
  };
}

/** Build the only CPCV bindings emitted by the UI; training semantics are absent. */
export function cpcvRequestBody(
  values: Record<string, unknown>,
): CpcvRequestBody {
  return {
    decision_policy_snapshot_id: values.decision_policy_snapshot_id as string,
    training_dataset_id: values.training_dataset_id as string,
  };
}
