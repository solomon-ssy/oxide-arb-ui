import type { ModelInputEvidenceView } from '@vben/types';

import { describe, expect, it } from 'vitest';

import { summarizeModelInputAudit } from './model-input-audit';

function row(
  overrides: Partial<ModelInputEvidenceView> = {},
): ModelInputEvidenceView {
  return {
    audit_fingerprint: 'fingerprint-a',
    encoded_column: 'feature.value',
    encoded_value_bits: '4607182418800017408',
    input_contract_hash: 'contract-a',
    raw_input_name: 'feature',
    raw_state: 'observed',
    raw_value: '1',
    training_input_hash: 'training-a',
    transform_hash: 'transform-a',
    ...overrides,
  };
}

describe('summarizeModelInputAudit', () => {
  it('returns null when no serving input evidence exists', () => {
    expect(summarizeModelInputAudit([])).toBeNull();
  });

  it('preserves exact hashes for a consistent encoded input set', () => {
    expect(
      summarizeModelInputAudit([
        row(),
        row({ encoded_column: 'feature.missing' }),
      ]),
    ).toEqual({
      consistent: true,
      inputContractHash: 'contract-a',
      trainingInputHash: 'training-a',
      transformHash: 'transform-a',
    });
  });

  it('surfaces a conflicting transform instead of silently choosing one', () => {
    expect(
      summarizeModelInputAudit([row(), row({ transform_hash: 'transform-b' })])
        ?.consistent,
    ).toBe(false);
  });
});
