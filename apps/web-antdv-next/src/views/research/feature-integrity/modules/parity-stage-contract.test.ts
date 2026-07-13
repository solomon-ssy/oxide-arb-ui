import { FEATURE_PARITY_STAGES } from '@vben/types';

import { describe, expect, it } from 'vitest';

import enUs from '../../../../locales/langs/en-US/enum.json';
import zhCn from '../../../../locales/langs/zh-CN/enum.json';

const wireStages = [
  'capture',
  'data_quality',
  'factor',
  'feature_cell',
  'model_input',
  'prediction',
  'selection',
  'snapshot',
] as const;

describe('feature parity stage wire contract', () => {
  it('exposes every backend stage without a silent UI fallback', () => {
    expect(Object.values(FEATURE_PARITY_STAGES).toSorted()).toEqual(wireStages);
  });

  it.each(wireStages)('has complete bilingual text for %s', (stage) => {
    expect(enUs.featureParityStage[stage]).toBeTruthy();
    expect(zhCn.featureParityStage[stage]).toBeTruthy();
  });
});
