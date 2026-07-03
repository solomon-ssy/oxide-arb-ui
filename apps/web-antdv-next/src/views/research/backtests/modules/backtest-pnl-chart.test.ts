import type { PnlCurvePoint } from '@vben/types';

import { describe, expect, it } from 'vitest';

import { buildPnlCurveSeries } from './backtest-pnl-series';

describe('buildPnlCurveSeries', () => {
  it('returns an empty series for missing / empty input', () => {
    expect(buildPnlCurveSeries(undefined)).toEqual([]);
    expect(buildPnlCurveSeries([])).toEqual([]);
  });

  it('maps a single point to [epochMs, usd]', () => {
    const points: PnlCurvePoint[] = [
      {
        as_of: '2026-01-01T00:00:00.000Z',
        cumulative_realized_pnl_usd: '12.5',
      },
    ];
    expect(buildPnlCurveSeries(points)).toEqual([
      [Date.parse('2026-01-01T00:00:00.000Z'), 12.5],
    ]);
  });

  it('preserves order across multiple points', () => {
    const points: PnlCurvePoint[] = [
      { as_of: '2026-01-01T00:00:00.000Z', cumulative_realized_pnl_usd: '0' },
      {
        as_of: '2026-01-01T01:00:00.000Z',
        cumulative_realized_pnl_usd: '5.25',
      },
      {
        as_of: '2026-01-01T02:00:00.000Z',
        cumulative_realized_pnl_usd: '-3.1',
      },
    ];
    expect(buildPnlCurveSeries(points)).toEqual([
      [Date.parse('2026-01-01T00:00:00.000Z'), 0],
      [Date.parse('2026-01-01T01:00:00.000Z'), 5.25],
      [Date.parse('2026-01-01T02:00:00.000Z'), -3.1],
    ]);
  });

  it('drops rows with an unparsable date or value', () => {
    const points: PnlCurvePoint[] = [
      { as_of: 'not-a-date', cumulative_realized_pnl_usd: '1' },
      { as_of: '2026-01-01T00:00:00.000Z', cumulative_realized_pnl_usd: '' },
      { as_of: '2026-01-01T01:00:00.000Z', cumulative_realized_pnl_usd: '2' },
    ];
    expect(buildPnlCurveSeries(points)).toEqual([
      [Date.parse('2026-01-01T01:00:00.000Z'), 2],
    ]);
  });
});
