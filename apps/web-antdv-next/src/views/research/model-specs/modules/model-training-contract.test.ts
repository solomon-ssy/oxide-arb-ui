import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MODEL_TRAINING_CONTRACT,
  normalizeModelTrainingContract,
} from './model-training-contract';

describe('normalizeModelTrainingContract', () => {
  it('normalizes the explicit settlement contract', () => {
    expect(
      normalizeModelTrainingContract({
        ...DEFAULT_MODEL_TRAINING_CONTRACT,
        target_label_name: ' settlement_outcome ',
      }),
    ).toEqual(DEFAULT_MODEL_TRAINING_CONTRACT);
  });

  it('rejects missing labels, invalid horizons, and invalid fold counts', () => {
    expect(
      normalizeModelTrainingContract({
        ...DEFAULT_MODEL_TRAINING_CONTRACT,
        target_label_name: ' ',
      }),
    ).toBeNull();
    expect(
      normalizeModelTrainingContract({
        ...DEFAULT_MODEL_TRAINING_CONTRACT,
        target_label_name: '标'.repeat(43),
      }),
    ).toBeNull();
    expect(
      normalizeModelTrainingContract({
        ...DEFAULT_MODEL_TRAINING_CONTRACT,
        target_label_horizon_secs: -1,
      }),
    ).toBeNull();
    expect(
      normalizeModelTrainingContract({
        ...DEFAULT_MODEL_TRAINING_CONTRACT,
        validation_folds: 1,
      }),
    ).toBeNull();
  });
});
