import { describe, expect, it } from 'vitest';

import {
  cpcvFrozenContractFromSpec,
  cpcvRequestBody,
} from './model-cpcv-contract';

describe('cpcv frozen contract', () => {
  it('projects the exact model-spec contract without family heuristics', () => {
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
          target_label_horizon_secs: 900,
          target_label_name: 'governed_exit_alpha',
          validation_folds: 5,
        },
      }),
    ).toEqual({
      modelFamily: 'hold_vs_exit_weighted',
      predictionHorizonSecs: 43_200,
      rawInputCount: 2,
      targetLabelHorizonSecs: 900,
      targetLabelName: 'governed_exit_alpha',
      validationFolds: 5,
    });
  });

  it('emits only dataset and validation-runtime bindings', () => {
    const body = cpcvRequestBody({
      label_horizon_secs: 900,
      label_name: 'must_not_escape',
      model_family: 'must_not_escape',
      prediction_horizon_secs: 43_200,
      decision_policy_snapshot_id: 'runtime-id',
      training_dataset_id: 'dataset-id',
    });

    expect(body).toEqual({
      decision_policy_snapshot_id: 'runtime-id',
      training_dataset_id: 'dataset-id',
    });
    expect(Object.keys(body).toSorted()).toEqual([
      'decision_policy_snapshot_id',
      'training_dataset_id',
    ]);
  });
});
