import type { ModelFamily, ModelTrainingContract } from '@vben/types';

import { MODEL_FAMILIES } from '@vben/types';

type ModelTrainingTarget = ModelTrainingContract['target'];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export const DEFAULT_MODEL_TRAINING_CONTRACT: ModelTrainingContract = {
  evaluation_trade_policy_artifact_id: null,
  target: { kind: 'outcome_payout' },
  validation_folds: 3,
};

/** Resolve the immutable Dataset label owned by a typed target. */
export function trainingTargetLabel(target: ModelTrainingTarget): string {
  switch (target.kind) {
    case 'forward_return': {
      return 'return_to_horizon';
    }
    case 'hold_vs_exit_alpha': {
      return 'hold_vs_exit_alpha_bps';
    }
    case 'outcome_payout': {
      return 'token_payout_ratio';
    }
  }
}

/** Resolve the immutable label horizon owned by a typed target. */
export function trainingTargetHorizon(target: ModelTrainingTarget): number {
  return target.kind === 'forward_return' ? target.horizon_secs : 0;
}

/** Derive the only target compatible with one estimator family. */
export function modelTrainingTarget(
  modelFamily: ModelFamily,
  predictionHorizonSecs: number,
): ModelTrainingTarget | null {
  if (
    !Number.isSafeInteger(predictionHorizonSecs) ||
    predictionHorizonSecs <= 0
  ) {
    return null;
  }
  if (modelFamily === MODEL_FAMILIES.holdVsExitWeighted) {
    return { kind: 'hold_vs_exit_alpha' };
  }
  if (
    modelFamily === MODEL_FAMILIES.weightedFactor ||
    modelFamily === MODEL_FAMILIES.classicalLogisticRegression
  ) {
    return { kind: 'outcome_payout' };
  }
  return { horizon_secs: predictionHorizonSecs, kind: 'forward_return' };
}

/** Preserve editable governance fields while replacing a derived target. */
export function trainingContractForModel(
  contract: ModelTrainingContract,
  modelFamily: ModelFamily,
  predictionHorizonSecs: number,
): ModelTrainingContract | null {
  const target = modelTrainingTarget(modelFamily, predictionHorizonSecs);
  if (!target) return null;
  return { ...contract, target };
}

function sameTarget(
  left: ModelTrainingTarget,
  right: ModelTrainingTarget,
): boolean {
  if (left.kind !== right.kind) return false;
  return (
    left.kind !== 'forward_return' ||
    (right.kind === 'forward_return' &&
      left.horizon_secs === right.horizon_secs)
  );
}

/** Validate the complete typed contract against its owning model semantics. */
export function normalizeModelTrainingContract(
  contract: ModelTrainingContract | null | undefined,
  modelFamily: ModelFamily,
  predictionHorizonSecs: number,
): ModelTrainingContract | null {
  if (!contract) return null;
  const expectedTarget = modelTrainingTarget(
    modelFamily,
    predictionHorizonSecs,
  );
  if (!expectedTarget || !sameTarget(contract.target, expectedTarget)) {
    return null;
  }
  if (
    !Number.isSafeInteger(contract.validation_folds) ||
    contract.validation_folds < 2 ||
    contract.validation_folds > 20
  ) {
    return null;
  }
  const policyId = contract.evaluation_trade_policy_artifact_id;
  if (
    policyId !== null &&
    policyId !== undefined &&
    !UUID_PATTERN.test(policyId)
  ) {
    return null;
  }
  return {
    evaluation_trade_policy_artifact_id: policyId ?? null,
    target: expectedTarget,
    validation_folds: contract.validation_folds,
  };
}
