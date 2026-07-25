import { describe, expect, it } from 'vitest';

import { backtestRequestBody } from './model-backtest-contract';

describe('model Evaluation backtest workflow', () => {
  it('emits only immutable evaluation bindings', () => {
    expect(
      backtestRequestBody({
        calibrate: true,
        comparison_model_version_id: 'baseline-id',
        decision_policy_snapshot_id: 'policy-id',
        evaluation_dataset_id: 'evaluation-id',
        training_dataset_id: 'must_not_escape',
      }),
    ).toEqual({
      comparison_model_version_id: 'baseline-id',
      decision_policy_snapshot_id: 'policy-id',
      evaluation_dataset_id: 'evaluation-id',
    });
  });

  it('refuses missing, blank, or non-string bindings', () => {
    expect(
      backtestRequestBody({ evaluation_dataset_id: 'evaluation-id' }),
    ).toBeNull();
    expect(
      backtestRequestBody({
        decision_policy_snapshot_id: 'policy-id',
        evaluation_dataset_id: 7,
      }),
    ).toBeNull();
    expect(
      backtestRequestBody({
        comparison_model_version_id: '',
        decision_policy_snapshot_id: 'policy-id',
        evaluation_dataset_id: 'evaluation-id',
      }),
    ).toBeNull();
  });
});
