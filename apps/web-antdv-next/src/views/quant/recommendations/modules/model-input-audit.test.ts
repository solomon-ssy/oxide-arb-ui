import type { ModelInputEvidenceView } from '@vben/types';

import {
  FACTOR_INDETERMINATE_REASONS,
  NORMALIZATION_SOURCES,
} from '@vben/types';

import { describe, expect, it } from 'vitest';

import enUS from '#/locales/langs/en-US/enum.json';
import zhCN from '#/locales/langs/zh-CN/enum.json';

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

  it.each([enUS, zhCN])(
    'can present every governed factor audit outcome in the recommendation audit surface',
    (locale) => {
      for (const source of Object.values(NORMALIZATION_SOURCES)) {
        expect(locale.normalizationSource[source]).toBeTruthy();
      }
      for (const reason of Object.values(FACTOR_INDETERMINATE_REASONS)) {
        expect(locale.factorIndeterminateReason[reason]).toBeTruthy();
      }
    },
  );
});
