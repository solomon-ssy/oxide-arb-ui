/**
 * Pure live-order-book math for the market detail charts.
 *
 * All backend prices / sizes arrive as `rust_decimal` strings; parsing goes
 * through `decimal.js` (never `parseFloat`). The resulting numbers are for
 * chart / KPI display only — never fed back into money math.
 */
import type {
  BookLevelView,
  MarketBookSideView,
  MicrostructureBucket,
} from '@vben/types';

import { parseDecimal } from '#/shared/components/format';

type BookSide = MarketBookSideView | null | undefined;

/** Parse a decimal string to a number, or `null` when empty / invalid. */
export function toNumber(value: null | string | undefined): null | number {
  const decimal = parseDecimal(value ?? null);
  return decimal ? decimal.toNumber() : null;
}

/** Best bid price (top of the descending bid ladder). */
export function bestBid(side: BookSide): null | number {
  return side?.bids?.[0] ? toNumber(side.bids[0].price) : null;
}

/** Best ask price (top of the ascending ask ladder). */
export function bestAsk(side: BookSide): null | number {
  return side?.asks?.[0] ? toNumber(side.asks[0].price) : null;
}

/** Mid price `(bestBid + bestAsk) / 2`, or `null` when a side is empty. */
export function midPrice(side: BookSide): null | number {
  const bid = bestBid(side);
  const ask = bestAsk(side);
  return bid !== null && ask !== null ? (bid + ask) / 2 : null;
}

/** Top-of-book spread in basis points relative to mid. */
export function spreadBps(side: BookSide): null | number {
  const bid = bestBid(side);
  const ask = bestAsk(side);
  if (bid === null || ask === null) {
    return null;
  }
  const mid = (bid + ask) / 2;
  return mid > 0 ? ((ask - bid) / mid) * 10_000 : null;
}

/** Sum resting notional (Σ price × size) over one ladder side. */
function ladderNotional(levels: BookLevelView[] | undefined): number {
  let total = 0;
  for (const level of levels ?? []) {
    const price = toNumber(level.price) ?? 0;
    const size = toNumber(level.size) ?? 0;
    total += price * size;
  }
  return total;
}

/** Total resting notional (bids + asks) for one token, in USD. */
export function sideDepthUsd(side: BookSide): number {
  return ladderNotional(side?.bids) + ladderNotional(side?.asks);
}

/**
 * Near-touch depth (levels per side) for the queue-imbalance signal. MUST match
 * the backend `IMBALANCE_DEPTH_LEVELS` constant so this instantaneous KPI stays
 * comparable to the persisted `imbalance_avg` series.
 */
const IMBALANCE_DEPTH_LEVELS = 5;

/** Sum share depth (Σ size) over the best `n` levels of one ladder side. */
function topNShareDepth(
  levels: BookLevelView[] | undefined,
  n: number,
): number {
  let total = 0;
  for (const level of (levels ?? []).slice(0, n)) {
    total += toNumber(level.size) ?? 0;
  }
  return total;
}

/**
 * Top-N share-weighted queue imbalance `(bid - ask) / (bid + ask)` in `[-1, 1]`,
 * bid-heavy positive. Uses near-touch share depth (not full-book USD notional),
 * matching the backend `imbalance()` so live and historical values agree.
 */
export function imbalance(side: BookSide): null | number {
  const bid = topNShareDepth(side?.bids, IMBALANCE_DEPTH_LEVELS);
  const ask = topNShareDepth(side?.asks, IMBALANCE_DEPTH_LEVELS);
  const total = bid + ask;
  return total > 0 ? (bid - ask) / total : null;
}

/** One point of a cumulative depth curve. */
export interface DepthCurvePoint {
  price: number;
  /** Cumulative shares from the best price outward. */
  cumSize: number;
}

/**
 * Build a cumulative depth curve from a ladder (levels are best-first). Bids
 * accumulate from the best bid downward, asks from the best ask upward; the
 * returned points are always sorted ascending by price for a left-to-right
 * depth chart.
 */
export function cumulativeDepth(
  levels: BookLevelView[] | undefined,
  side: 'ask' | 'bid',
): DepthCurvePoint[] {
  const points: DepthCurvePoint[] = [];
  let cumSize = 0;
  for (const level of levels ?? []) {
    const price = toNumber(level.price);
    const size = toNumber(level.size) ?? 0;
    if (price === null) {
      continue;
    }
    cumSize += size;
    points.push({ price, cumSize });
  }
  // Bids are best-first (descending price); reverse so the x-axis reads low→high.
  return side === 'bid' ? points.toReversed() : points;
}

/** A `[epochMs, value]` point for an ECharts time-axis series (`null` = gap). */
export type BucketPoint = [number, null | number];

/**
 * Map microstructure buckets into `[bucket_ms, value]` points via `pick`,
 * keeping `null` gaps so ECharts breaks the line where data is missing.
 */
export function bucketSeries(
  buckets: MicrostructureBucket[],
  pick: (bucket: MicrostructureBucket) => null | number,
): BucketPoint[] {
  return buckets.map((bucket) => [bucket.bucket_ms, pick(bucket)]);
}
