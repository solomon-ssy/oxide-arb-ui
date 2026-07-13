import { FACTOR_VALUE_STATES, FEATURE_CELL_STATES } from '@vben/types';

import { describe, expect, it } from 'vitest';

import {
  useFeatureCellStateTagOptions,
  useModelInputStateTagOptions,
} from '#/shared/components/format/tag-options';

import enUs from '../../../../locales/langs/en-US/enum.json';
import zhCn from '../../../../locales/langs/zh-CN/enum.json';

describe('serving evidence state i18n contract', () => {
  it.each(Object.values(FEATURE_CELL_STATES))(
    'has bilingual FeatureCell text for %s',
    (state) => {
      expect(enUs.featureCellState[state]).toBeTruthy();
      expect(zhCn.featureCellState[state]).toBeTruthy();
    },
  );

  it.each(Object.values(FACTOR_VALUE_STATES))(
    'has bilingual model-input text for %s',
    (state) => {
      expect(enUs.factorValueState[state]).toBeTruthy();
      expect(zhCn.factorValueState[state]).toBeTruthy();
    },
  );

  it('routes every state through the shared semantic tag catalogs', () => {
    expect(
      useFeatureCellStateTagOptions()
        .map(({ value }) => value)
        .toSorted(),
    ).toEqual(Object.values(FEATURE_CELL_STATES).toSorted());

    const expectedModelInputStates = new Set([
      ...Object.values(FEATURE_CELL_STATES),
      ...Object.values(FACTOR_VALUE_STATES),
    ]);
    expect(
      useModelInputStateTagOptions()
        .map(({ value }) => value)
        .toSorted(),
    ).toEqual([...expectedModelInputStates].toSorted());
  });
});
