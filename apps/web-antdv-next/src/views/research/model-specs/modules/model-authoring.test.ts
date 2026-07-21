import type { FeatureContractView } from '@vben/types';

import { describe, expect, it } from 'vitest';

import { featureContractOptions } from './feature-contract-options';
import {
  DEFAULT_MODEL_TRAINING_CONTRACT,
  normalizeModelTrainingContract,
} from './model-training-contract';

describe('model-spec authoring', () => {
  it('offers only features from the backend-governed catalog', () => {
    const contract: FeatureContractView = {
      feature_schema_hash:
        'blake3:0000000000000000000000000000000000000000000000000000000000000000',
      feature_schema_version: 1,
      features: [
        {
          compute_revision: 3,
          family: 'price_book',
          name: 'book.dynamic_window_17s',
          null_policy: { policy: 'penalize' },
          point_in_time_rule: 'book_version_at_or_before_source_cutoff',
          source: 'published_l2_book',
          staleness_policy: 'max_book_age',
          unit: 'ratio',
          value_kind: 'decimal',
        },
        {
          compute_revision: 1,
          family: 'price_book',
          name: 'book.secondary_best_ask',
          null_policy: { policy: 'penalize' },
          point_in_time_rule: 'book_version_at_or_before_source_cutoff',
          source: 'published_l2_book',
          staleness_policy: 'max_book_age',
          unit: 'probability',
          value_kind: 'probability',
        },
      ],
    };

    expect(featureContractOptions(contract)).toEqual([
      {
        label: 'book.dynamic_window_17s',
        value: 'book.dynamic_window_17s',
      },
      {
        label: 'book.secondary_best_ask',
        value: 'book.secondary_best_ask',
      },
    ]);
  });

  it('normalizes the complete generated training contract', () => {
    expect(
      normalizeModelTrainingContract({
        ...DEFAULT_MODEL_TRAINING_CONTRACT,
        target_label_name: ' settlement_outcome ',
      }),
    ).toEqual(DEFAULT_MODEL_TRAINING_CONTRACT);

    const policyArtifactId = '01900000-0000-7000-8000-000000000099';
    expect(
      normalizeModelTrainingContract({
        ...DEFAULT_MODEL_TRAINING_CONTRACT,
        target_label_name: 'policy_net_return_bps',
        trade_policy_artifact_id: policyArtifactId,
      })?.trade_policy_artifact_id,
    ).toBe(policyArtifactId);
  });

  it('rejects malformed labels, horizons, and fold counts before submit', () => {
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
