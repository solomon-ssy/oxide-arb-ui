import { describe, expect, it } from 'vitest';

import { backtestRequestBody } from './model-backtest-contract';

describe('model Evaluation backtest workflow', () => {
  it('emits the exact immutable evaluation bindings', () => {
    expect(
      backtestRequestBody({
        comparison_model_version_id: 'baseline-id',
        decision_policy_snapshot_id: 'policy-id',
        evaluation_dataset_id: 'evaluation-id',
      }),
    ).toEqual({
      comparison_model_version_id: 'baseline-id',
      decision_policy_snapshot_id: 'policy-id',
      evaluation_dataset_id: 'evaluation-id',
    });
  });

  it('rejects unknown form fields', () => {
    expect(
      backtestRequestBody({
        decision_policy_snapshot_id: 'policy-id',
        evaluation_dataset_id: 'evaluation-id',
        training_dataset_id: 'removed-field',
      }),
    ).toBeNull();
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
