import type {
  Paginated,
  RiskAuditEventView,
  TradeDecisionsQuery,
  TradePageQuery,
  TradeView,
  UuidString,
} from '@vben/types';

import { requestClient } from '#/api/request';

export namespace TradeApi {
  export const base = '/trades';
  export const decisions = `${base}/decisions`;
  export const detail = (tradeId: UuidString) => `${base}/${tradeId}`;
}

/** `GET /trades` — filtered, paginated trade history (newest first). */
export async function fetchTradePage(query: TradePageQuery = {}) {
  return requestClient.get<Paginated<TradeView>>(TradeApi.base, {
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
