import type {
  PageQuery,
  Paginated,
  ReconcileTradeRequest,
  RiskAuditEventView,
  TradeDecisionsQuery,
  TradePageQuery,
  TradeView,
  UuidString,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { withSilentError } from '@vben/request/oxide';

import { buildGovernedHeaders } from '#/api/governed-request';
import { requestClient } from '#/api/request';

export namespace TradeApi {
  export const base = '/trades';
  export const decisions = `${base}/decisions`;
  export const reconciliation = `${base}/reconciliation`;
  export const detail = (tradeId: UuidString) => `${base}/${tradeId}`;
  export const reconcile = (tradeId: UuidString) =>
    `${base}/${tradeId}/reconcile`;
}

/** `GET /trades` — filtered, paginated trade history (newest first). */
export async function fetchTradePage(query: TradePageQuery = {}) {
  return requestClient.get<Paginated<TradeView>>(TradeApi.base, {
    params: query,
  });
}

/** `GET /trades/reconciliation` — trades pending manual reconciliation. */
export async function fetchReconciliationQueue(query: PageQuery = {}) {
  return requestClient.get<Paginated<TradeView>>(TradeApi.reconciliation, {
    params: query,
  });
}

/** `GET /trades/{trade_id}` — single trade detail. */
export async function getTradeById(tradeId: UuidString) {
  return requestClient.get<TradeView>(TradeApi.detail(tradeId));
}

/** `GET /trades/decisions` — risk-decision audit events in a time window. */
export async function fetchTradeDecisions(query: TradeDecisionsQuery = {}) {
  return requestClient.get<Paginated<RiskAuditEventView>>(TradeApi.decisions, {
    params: query,
  });
}

/**
 * `POST /trades/{trade_id}/reconcile` — governed manual close as unresolvable.
 * Requires `X-Acting-Role`; the governed modal supplies `note` via `ctx.reason`.
 */
export async function reconcileTrade(
  tradeId: UuidString,
  body: ReconcileTradeRequest,
  ctx: GovernedContext,
) {
  return requestClient.post<TradeView>(TradeApi.reconcile(tradeId), body, {
    ...withSilentError({}),
    headers: buildGovernedHeaders(ctx),
  });
}
