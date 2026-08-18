import { describe, expect, it } from 'vitest';

import {
  backtestOpenPath,
  calibrationArtifactOpenPath,
  comparisonOpenPath,
  factorOpenPath,
  feedbackCycleOpenPath,
  marketLinkageOpenPath,
  modelSpecOpenPath,
  modelVersionOpenPath,
  tradePolicyOpenPath,
  trainingDatasetOpenPath,
} from './research-plane';

describe('research-plane routes', () => {
  it('builds lab entity open paths', () => {
    expect(modelSpecOpenPath('spec/1')).toBe(
      '/research/lab?module=specs&entity=model-spec&id=spec%2F1',
    );
    expect(trainingDatasetOpenPath('ds-1')).toBe(
      '/research/lab?module=datasets&entity=training-dataset&id=ds-1',
    );
    expect(modelVersionOpenPath('mv-1')).toBe(
      '/research/lab?module=models&entity=model-version&id=mv-1',
    );
    expect(factorOpenPath('factor-1')).toBe(
      '/research/lab?module=factors&entity=factor&id=factor-1',
    );
    expect(backtestOpenPath('bt-1')).toBe(
      '/research/lab?module=evaluation&entity=backtest&id=bt-1',
    );
    expect(comparisonOpenPath('cmp-1')).toBe(
      '/research/lab?module=evaluation&entity=comparison&id=cmp-1',
    );
  });

  it('builds learning-policy and data-reliability open paths', () => {
    expect(tradePolicyOpenPath('policy-1')).toBe(
      '/research/learning-policy?module=policies&entity=trade-policy&id=policy-1',
    );
    expect(calibrationArtifactOpenPath('cal-1')).toBe(
      '/research/learning-policy?module=calibration&entity=calibration-artifact&id=cal-1',
    );
    expect(feedbackCycleOpenPath('cycle-1')).toBe(
      '/research/learning-policy?module=feedback&entity=feedback-cycle&id=cycle-1',
    );
    expect(marketLinkageOpenPath('m-1')).toBe(
      '/research/data-reliability?module=linkages&entity=market-linkage&id=m-1',
    );
  });
});
