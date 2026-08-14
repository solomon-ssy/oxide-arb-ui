import { describe, expect, it } from 'vitest';

import {
  cpcvFrozenContractFromSpec,
  cpcvRequestBody,
} from './model-cpcv-contract';

describe('model CPCV workflow', () => {
  it('projects immutable training semantics from the selected model spec', () => {
    expect(
      cpcvFrozenContractFromSpec({
        input_contract: {
          inputs: [
            { feature_name: 'book.mid', requiredness: 'required' },
            { feature_name: 'market.age', requiredness: 'optional' },
          ],
        },
        model_family: 'hold_vs_exit_weighted',
        prediction_horizon_secs: 43_200,
        training_contract: {
          evaluation_trade_policy_artifact_id: null,
          target: { kind: 'hold_vs_exit_alpha' },
          validation_folds: 5,
        },
      }),
    ).toEqual({
      modelFamily: 'hold_vs_exit_weighted',
      predictionHorizonSecs: 43_200,
      rawInputCount: 2,
      targetLabelHorizonSecs: 0,
      targetLabelName: 'hold_vs_exit_alpha_bps',
      validationFolds: 5,
    });
  });

  it('emits only dataset and validation-runtime bindings', () => {
    expect(
      cpcvRequestBody({
        decision_policy_snapshot_id: 'runtime-id',
        label_horizon_secs: 900,
        label_name: 'must_not_escape',
        model_family: 'must_not_escape',
        prediction_horizon_secs: 43_200,
        training_dataset_id: 'dataset-id',
      }),
    ).toEqual({
      decision_policy_snapshot_id: 'runtime-id',
      training_dataset_id: 'dataset-id',
    });
  });

  it('refuses incomplete bindings instead of casting form values', () => {
    expect(cpcvRequestBody({ training_dataset_id: 'dataset-id' })).toBeNull();
    expect(
      cpcvRequestBody({
        decision_policy_snapshot_id: 'runtime-id',
        training_dataset_id: 7,
      }),
    ).toBeNull();
  });
});
