/** Cross-page deep-link paths for the quant execution plane. */

export interface ReconciliationQueuePathParams {
  execution_order_id?: string;
  order_intent_id?: string;
}

/** Unresolved reconciliation queue with optional entity filters. */
export function reconciliationQueuePath(
  params: ReconciliationQueuePathParams = {},
): string {
  const search = new URLSearchParams();
  if (params.execution_order_id) {
    search.set('execution_order_id', params.execution_order_id);
  }
  if (params.order_intent_id) {
    search.set('order_intent_id', params.order_intent_id);
  }
  const query = search.toString();
  return query ? `/quant/reconciliations?${query}` : '/quant/reconciliations';
}

export interface SettlementRedeemsPathParams {
  market_id?: string;
}

/** Settlement-redeem batch list with optional market filter. */
export function settlementRedeemsPath(
  params: SettlementRedeemsPathParams = {},
): string {
  const search = new URLSearchParams();
  if (params.market_id) {
    search.set('market_id', params.market_id);
  }
  const query = search.toString();
  return query
    ? `/quant/settlement-redeems?${query}`
    : '/quant/settlement-redeems';
}

/** Open an execution-order detail drawer on the ledger page. */
export function executionOrderOpenPath(executionOrderId: string): string {
  return `/quant/execution-orders?open=${encodeURIComponent(executionOrderId)}`;
}

/** Open a position detail drawer on the ledger page. */
export function positionOpenPath(positionId: string): string {
  return `/quant/positions?open=${encodeURIComponent(positionId)}`;
}

/** Open a settlement-redeem detail drawer on the batch list page. */
export function settlementRedeemOpenPath(settlementRedeemId: string): string {
  return `/quant/settlement-redeems?open=${encodeURIComponent(settlementRedeemId)}`;
}

/** Whether a reactive `?open=` query still targets the id we fetched. */
export function queryOpenIdMatches(
  requestedId: string,
  currentRaw: unknown,
): boolean {
  const openId = Array.isArray(currentRaw) ? currentRaw[0] : currentRaw;
  return typeof openId === 'string' && openId !== '' && openId === requestedId;
}
