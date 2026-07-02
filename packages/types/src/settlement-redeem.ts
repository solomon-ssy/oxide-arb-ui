import type {
  DecimalString,
  IsoDateTime,
  PageQuery,
  SharesString,
  TimeRangeQuery,
  UsdString,
  UuidString,
} from './common';
import type { OutcomeSide, SettlementRedeemState } from './enums';

/** One redeemed lot within a settlement-redeem batch. */
export interface SettlementRedeemLotView {
  settlement_redeem_lot_id: UuidString;
  settlement_redeem_id: UuidString;
  position_id: UuidString;
  order_intent_id: UuidString;
  token_id: string;
  side: OutcomeSide;
  shares_redeemed: SharesString;
  cost_basis_usd: UsdString;
  payout_usd: UsdString;
  realized_pnl_usd: UsdString;
  created_at: IsoDateTime;
}

/** `GET /quant/settlement-redeems` row header. */
export interface SettlementRedeemView {
  settlement_redeem_id: UuidString;
  market_id: string;
  funder_address: string;
  wallet_kind: string;
  state: SettlementRedeemState;
  tx_hash: null | string;
  payout_usd: UsdString;
  gas_fee_pol: DecimalString | null;
  attempt_count: number;
  next_attempt_at: IsoDateTime | null;
  last_error: null | string;
  submitted_at: IsoDateTime | null;
  confirmed_at: IsoDateTime | null;
  failed_at: IsoDateTime | null;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

/** `GET /quant/settlement-redeems/{id}` — batch header + redeemed lots. */
export interface SettlementRedeemDetailView extends SettlementRedeemView {
  lots: SettlementRedeemLotView[];
}

/** Filter + pagination for `GET /quant/settlement-redeems`. */
export interface SettlementRedeemListQuery extends PageQuery, TimeRangeQuery {
  state?: SettlementRedeemState;
  market_id?: string;
}
