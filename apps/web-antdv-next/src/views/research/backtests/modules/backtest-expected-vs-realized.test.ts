import { describe, expect, it } from 'vitest';

import { parseExpectedVsRealized } from './backtest-expected-vs-realized';

describe('parseExpectedVsRealized', () => {
  it('returns empty for missing / invalid input', () => {
    expect(parseExpectedVsRealized(undefined)).toEqual({
      buckets: [],
      hasStructuredContent: false,
      summary: null,
    });
    expect(parseExpectedVsRealized([])).toEqual({
      buckets: [],
      hasStructuredContent: false,
      summary: null,
    });
  });

  it('parses canonical backend summary fields', () => {
    expect(
      parseExpectedVsRealized({
        bias_bps: '-3.5',
        correlation: '0.72',
        mean_expected_bps: '120',
        mean_realized_bps: '116.5',
      }),
    ).toEqual({
      buckets: [],
      hasStructuredContent: true,
      summary: {
        biasBps: '-3.5',
        correlation: '0.72',
        meanExpectedBps: '120',
        meanRealizedBps: '116.5',
      },
    });
  });

  it('parses optional decile buckets', () => {
    const parsed = parseExpectedVsRealized({
      buckets: [
        {
          decile: 1,
          expected_return_bps: 45,
          realized_return_bps: 38,
          samples: 980,
        },
        { decile: 'bad' },
      ],
    });
    expect(parsed.hasStructuredContent).toBe(true);
    expect(parsed.summary).toBeNull();
    expect(parsed.buckets).toEqual([
      {
        decile: 1,
        expectedReturnBps: '45',
        realizedReturnBps: '38',
        samples: 980,
      },
    ]);
  });
});
