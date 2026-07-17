import type {
  IsoDateTime,
  PageQuery,
  PriceString,
  SharesString,
  TimeRangeQuery,
  UsdString,
  UuidString,
} from './common';
import type { ReconciliationEvidenceKind, ReconciliationResult } from './enums';
import type { ExecutionOrderView } from './execution-order';
import type { ExecutionRecoverySummary } from './execution-recovery';

import { RECONCILIATION_RESULTS } from './enums';

/** One entry of a reconciliation's evidence chain. */
export interface ReconciliationEvidence {
  kind: ReconciliationEvidenceKind;
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
export interface ReconciliationListQuery extends PageQuery, TimeRangeQuery {
  result?: ReconciliationResult;
  /** `true` → only rows with `resolved_at`; `false` → only unresolved. */
  resolved?: boolean;
  execution_order_id?: UuidString;
  order_intent_id?: UuidString;
}

/** `POST /quant/reconciliations/{id}/resolve` governed request body. */
export interface ResolveReconciliationRequest {
  result: ReconciliationResult;
  filled_shares?: SharesString;
  avg_price?: PriceString;
  reason: string;
}

/** `POST /quant/reconciliations/{id}/resolve` response. */
export interface ResolveReconciliationResponse {
  execution_order: ExecutionOrderView;
  recovery: ExecutionRecoverySummary;
}

/**
 * Whether an operator may invoke `POST /quant/reconciliations/{id}/resolve`,
 * byte-aligned with `CoreReconciliationPort::resolve_operator`: only machine
 * `unresolvable` rows awaiting operator verdict (`resolved_at == null`).
 */
export function isReconciliationOperatorResolvable(
  reconciliation: Pick<ReconciliationView, 'resolved_at' | 'result'>,
): boolean {
  return (
    reconciliation.result === RECONCILIATION_RESULTS.unresolvable &&
    reconciliation.resolved_at === null
  );
}

/** Operator-selectable resolve verdicts (excludes `pending` / `unresolvable`). */
export const OPERATOR_RECONCILIATION_RESULTS = [
  RECONCILIATION_RESULTS.filled,
  RECONCILIATION_RESULTS.partiallyFilled,
  RECONCILIATION_RESULTS.notFilled,
  RECONCILIATION_RESULTS.cancelled,
] as const satisfies readonly ReconciliationResult[];
