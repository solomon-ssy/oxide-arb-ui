import {
  FACTOR_INDETERMINATE_REASONS,
  NORMALIZATION_SOURCES,
} from '@vben/types';

import { describe, expect, it } from 'vitest';

import enUS from '#/locales/langs/en-US/enum.json';
import zhCN from '#/locales/langs/zh-CN/enum.json';

describe('frozen factor audit wire contract', () => {
  it('exposes only the artifact-owned reference distribution wire values', () => {
    expect(Object.values(NORMALIZATION_SOURCES)).toEqual([
      'cross_section',
      'frozen_reference_quantile',
      'per_market',
    ]);
    expect(Object.values(FACTOR_INDETERMINATE_REASONS)).toEqual([
      'cross_section_too_small',
      'leg_book_missing',
      'no_frozen_reference',
      'zero_variance',
    ]);
  });

  it.each([enUS, zhCN])('localizes every governed audit value', (locale) => {
    for (const value of Object.values(NORMALIZATION_SOURCES)) {
      expect(locale.normalizationSource[value]).toBeTruthy();
    }
    for (const value of Object.values(FACTOR_INDETERMINATE_REASONS)) {
      expect(locale.factorIndeterminateReason[value]).toBeTruthy();
    }
  });
});
