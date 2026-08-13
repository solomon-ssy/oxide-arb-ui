import type { PnlCurvePoint } from '@vben/types';

import { parseDecimal } from '#/shared/components/format';

/** Cumulative realized-PnL curve → `[epochMs, usd]` points (drops bad rows). */
export function buildPnlCurveSeries(
  points: PnlCurvePoint[] | undefined,
): [number, number][] {
  if (!Array.isArray(points)) {
    return [];
  }
  const series: [number, number][] = [];
  for (const point of points) {
    const epochMs = new Date(point.decision_at).getTime();
    const value = parseDecimal(point.cumulative_realized_pnl_usd);
    if (Number.isFinite(epochMs) && value !== null) {
      series.push([epochMs, value.toNumber()]);
    }
  }
  return series;
}
