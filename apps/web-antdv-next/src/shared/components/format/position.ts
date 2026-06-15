import type { PositionView, UsdString } from '@vben/types';

import { parseDecimal } from './money';

/** Mark-to-market value: cost basis plus unrealized PnL. */
export function positionCurrentValueUsd(
  position: PositionView,
): null | UsdString {
  const cost = parseDecimal(position.total_cost_usd);
  const unrealized = parseDecimal(position.unrealized_pnl);
  if (cost === null || unrealized === null) {
    return null;
  }
  return cost.plus(unrealized).toString() as UsdString;
}
