/** Canonical workspace deep links for the trading plane.
 *
 * Live / queue / funnel / diff are object-stage views, not inventory tabs.
 * Open them from a selected market, report, or recommendation identity.
 */

/** Open a market object stage on the live book module. */
export function marketOpenPath(marketId: string): string {
  const search = new URLSearchParams();
  search.set('module', 'live');
  search.set('entity', 'market');
  search.set('id', marketId);
  return `/trading/market-intelligence?${search.toString()}`;
}
