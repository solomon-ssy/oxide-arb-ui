import { describe, expect, it } from 'vitest';

import { parseExpectedVsRealized } from './backtest-expected-vs-realized';

describe('parseExpectedVsRealized', () => {
  it('returns null for missing / invalid input', () => {
    expect(parseExpectedVsRealized(undefined)).toBeNull();
    expect(parseExpectedVsRealized([])).toBeNull();
    expect(parseExpectedVsRealized({})).toBeNull();
  });

  it('parses the canonical four summary scalars', () => {
    expect(
      parseExpectedVsRealized({
        bias_bps: '-3.5',
        correlation: '0.72',
        mean_expected_bps: '120',
        mean_realized_bps: '116.5',
      }),
    ).toEqual({
      biasBps: '-3.5',
      correlation: '0.72',
      meanExpectedBps: '120',
      meanRealizedBps: '116.5',
    });
  });
});
