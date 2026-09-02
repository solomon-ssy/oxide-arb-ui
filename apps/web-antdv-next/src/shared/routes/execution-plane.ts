/** Canonical workspace deep links for the execution plane. */

export interface ReconciliationQueuePathParams {
  execution_order_id?: string;
  order_intent_id?: string;
}

/** Unresolved reconciliation queue with optional entity filters. */
export function reconciliationQueuePath(
  params: ReconciliationQueuePathParams = {},
): string {
  const search = new URLSearchParams();
  search.set('module', 'reconciliation');
  if (params.execution_order_id) {
    search.set('execution_order_id', params.execution_order_id);
  }
  if (params.order_intent_id) {
    search.set('order_intent_id', params.order_intent_id);
  }
  return `/execution/post-trade?${search.toString()}`;
}

export interface SettlementRedeemsPathParams {
  market_id?: string;
}

/** Settlement-redeem batch list with optional market filter. */
export function settlementRedeemsPath(
  params: SettlementRedeemsPathParams = {},
): string {
  const search = new URLSearchParams();
  search.set('module', 'settlement');
  if (params.market_id) {
    search.set('market_id', params.market_id);
  }
  return `/execution/post-trade?${search.toString()}`;
}

/** Open an order-intent detail drawer on the ledger page. */
export function orderIntentOpenPath(orderIntentId: string): string {
  const search = new URLSearchParams();
  search.set('module', 'intents');
  search.set('entity', 'order-intent');
  search.set('id', orderIntentId);
  return `/execution/orders?${search.toString()}`;
}

/** Open an execution-order detail drawer on the ledger page. */
export function executionOrderOpenPath(executionOrderId: string): string {
  const search = new URLSearchParams();
  search.set('module', 'orders');
  search.set('entity', 'execution-order');
  search.set('id', executionOrderId);
  return `/execution/orders?${search.toString()}`;
}

/** Open a position detail drawer on the ledger page. */
export function positionOpenPath(strategyPositionLotId: string): string {
  return `/execution/portfolio?module=positions&entity=position&id=${encodeURIComponent(strategyPositionLotId)}`;
}

/** Open a settlement-redeem detail drawer on the batch list page. */
export function settlementRedeemOpenPath(settlementRedeemId: string): string {
  return `/execution/post-trade?module=settlement&entity=settlement-redeem&id=${encodeURIComponent(settlementRedeemId)}`;
}

/** Whether the current workspace query still targets the entity being fetched. */
export function queryEntityIdMatches(
  entityKind: string,
  requestedId: string,
  currentEntity: unknown,
  currentRaw: unknown,
): boolean {
  const currentKind = Array.isArray(currentEntity)
    ? currentEntity[0]
    : currentEntity;
  const currentId = Array.isArray(currentRaw) ? currentRaw[0] : currentRaw;
  return currentKind === entityKind && currentId === requestedId;
}
