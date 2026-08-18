/** Canonical workspace deep links for the trading plane. */

/** Open a market object stage on the live book module. */
export function marketOpenPath(marketId: string): string {
  const search = new URLSearchParams();
  search.set('module', 'live');
  search.set('entity', 'market');
  search.set('id', marketId);
  return `/trading/market-intelligence?${search.toString()}`;
}
