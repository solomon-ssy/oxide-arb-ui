import type { FeatureContractView } from '@vben/types';

import { MODEL_FAMILIES } from '@vben/types';

import { describe, expect, it } from 'vitest';

import { featureContractOptions } from './feature-contract-options';
import {
  DEFAULT_MODEL_TRAINING_CONTRACT,
  modelTrainingTarget,
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
      normalizeModelTrainingContract(
        DEFAULT_MODEL_TRAINING_CONTRACT,
        MODEL_FAMILIES.weightedFactor,
        86_400,
      ),
    ).toEqual(DEFAULT_MODEL_TRAINING_CONTRACT);

    const policyArtifactId = '01900000-0000-7000-8000-000000000099';
    expect(
      normalizeModelTrainingContract(
        {
          ...DEFAULT_MODEL_TRAINING_CONTRACT,
          evaluation_trade_policy_artifact_id: policyArtifactId,
        },
        MODEL_FAMILIES.weightedFactor,
        86_400,
      )?.evaluation_trade_policy_artifact_id,
    ).toBe(policyArtifactId);
  });

  it('derives the only family-compatible target', () => {
    expect(modelTrainingTarget(MODEL_FAMILIES.weightedFactor, 86_400)).toEqual({
      kind: 'outcome_payout',
    });
    expect(
      modelTrainingTarget(MODEL_FAMILIES.classicalLogisticRegression, 3600),
    ).toEqual({ kind: 'outcome_payout' });
    expect(modelTrainingTarget(MODEL_FAMILIES.classicalRidge, 3600)).toEqual({
      horizon_secs: 3600,
      kind: 'forward_return',
    });
    expect(
      modelTrainingTarget(MODEL_FAMILIES.holdVsExitWeighted, 3600),
    ).toEqual({ kind: 'hold_vs_exit_alpha' });
  });

  it('rejects target, policy, horizon, and fold mismatches', () => {
    expect(
      normalizeModelTrainingContract(
        {
          ...DEFAULT_MODEL_TRAINING_CONTRACT,
          target: { horizon_secs: 86_400, kind: 'forward_return' },
        },
        MODEL_FAMILIES.weightedFactor,
        86_400,
      ),
    ).toBeNull();
    expect(
      normalizeModelTrainingContract(
        {
          ...DEFAULT_MODEL_TRAINING_CONTRACT,
          evaluation_trade_policy_artifact_id: 'not-a-uuid',
        },
        MODEL_FAMILIES.weightedFactor,
        86_400,
      ),
    ).toBeNull();
    expect(
      normalizeModelTrainingContract(
        { ...DEFAULT_MODEL_TRAINING_CONTRACT, validation_folds: 1 },
        MODEL_FAMILIES.weightedFactor,
        86_400,
      ),
    ).toBeNull();
    expect(modelTrainingTarget(MODEL_FAMILIES.classicalRidge, -1)).toBeNull();
  });
});
