import type { ModelTrainingContract } from '@vben/types';

export const DEFAULT_MODEL_TRAINING_CONTRACT: ModelTrainingContract = {
  target_label_horizon_secs: 0,
  target_label_name: 'settlement_outcome',
  validation_folds: 3,
};

/** Validate and normalize the explicit model-spec training contract. */
export function normalizeModelTrainingContract(
  contract: ModelTrainingContract | null | undefined,
): ModelTrainingContract | null {
  if (!contract) return null;
  const targetLabelName = contract.target_label_name.trim();
  if (
    targetLabelName.length === 0 ||
    new TextEncoder().encode(targetLabelName).byteLength > 128
  ) {
    return null;
  }
  if (
    !Number.isSafeInteger(contract.target_label_horizon_secs) ||
    contract.target_label_horizon_secs < 0
  ) {
    return null;
  }
  if (
    !Number.isSafeInteger(contract.validation_folds) ||
    contract.validation_folds < 2 ||
    contract.validation_folds > 20
  ) {
    return null;
  }
  return {
    target_label_horizon_secs: contract.target_label_horizon_secs,
    target_label_name: targetLabelName,
    validation_folds: contract.validation_folds,
  };
}
