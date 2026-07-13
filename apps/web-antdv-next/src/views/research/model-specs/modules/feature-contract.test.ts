import type { FeatureContractView } from '@vben/types';

import { describe, expect, it } from 'vitest';

import { featureContractOptions } from './feature-contract-options';

describe('featureContractOptions', () => {
  it('projects only backend-governed features without local or factor fallbacks', () => {
    const contract: FeatureContractView = {
      feature_schema_hash:
        'blake3:0000000000000000000000000000000000000000000000000000000000000000',
      feature_schema_version: 6,
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
    expect(
      featureContractOptions(contract).some(
        ({ value }) => value === 'market.outcome_count',
      ),
    ).toBe(false);
  });
});
