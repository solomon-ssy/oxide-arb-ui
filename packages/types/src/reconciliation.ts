import type {
  IsoDateTime,
  PageQuery,
  PriceString,
  SharesString,
  UsdString,
  UuidString,
} from './common';
import type { ReconciliationResult } from './enums';

/** One entry of a reconciliation's evidence chain. */
export interface ReconciliationEvidence {
  kind: string;
  observed_at: IsoDateTime;
  detail: string;
  venue_ref: null | string;
  shares: null | SharesString;
  price: null | PriceString;
}

/** `GET /quant/reconciliations/{id}` — a reconciliation row + evidence chain. */
export interface ReconciliationView {
  reconciliation_id: UuidString;
  execution_order_id: UuidString;
  order_intent_id: UuidString;
  result: ReconciliationResult;
  evidence_json: ReconciliationEvidence[];
  venue_filled_shares: null | SharesString;
  venue_avg_price: null | PriceString;
  discrepancy_usd: null | UsdString;
  resolved_by: null | string;
  resolved_at: IsoDateTime | null;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

/** Filter + pagination for `GET /quant/reconciliations`. */
export interface ReconciliationListQuery extends PageQuery {
  result?: ReconciliationResult;
}

/** `POST /quant/reconciliations/{id}/resolve` governed request body. */
export interface ResolveReconciliationRequest {
  reason: string;
  resolution: ReconciliationResult;
}

/** `POST /quant/reconciliations/{id}/resolve` response. */
export interface ResolveReconciliationResponse {
  reconciliation: ReconciliationView;
}
