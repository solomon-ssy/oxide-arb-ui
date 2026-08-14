export type MarketFreshnessState = 'fresh' | 'stale' | 'unknown';

export function resolveMarketFreshnessState(input: {
  bookAgeMs: null | number;
  fresh: boolean;
}): MarketFreshnessState {
  if (input.bookAgeMs === null) return 'unknown';
  return input.fresh ? 'fresh' : 'stale';
}
