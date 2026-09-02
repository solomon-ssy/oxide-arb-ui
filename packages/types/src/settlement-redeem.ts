import type {
  DecimalString,
  IsoDateTime,
  PageQuery,
  SharesString,
  TimeRangeQuery,
  UsdString,
  UuidString,
} from './common';
import type {
  ExecutionWalletKind,
  ExitSettlementMode,
  OutcomeSide,
  RedeemPolicy,
  SettlementAuthorizationState,
  SettlementCaseState,
  SettlementEffectivePolicy,
  SettlementGovernedActionKind,
  SettlementGovernedActionState,
  SettlementReadinessStatus,
  SettlementReconciliationState,
  SettlementRoute,
  SettlementSubmissionKind,
  SettlementSubmissionPurpose,
  SettlementSubmissionState,
  SettlementWritePolicy,
} from './enums';

export type SettlementDeploymentSource =
  | 'changelog'
  | 'contracts_documentation'
  | 'ctf_exchange_v2_readme';

export interface SettlementDeploymentProvenanceView {
  retrieved_at: string;
  revision: null | string;
  source: SettlementDeploymentSource;
  source_url: string;
}

export type SettlementReadinessReason = Record<
  string,
  boolean | null | number | string
> & { code: string };

export type SettlementDeploymentAdvisory = Record<
  string,
  boolean | null | number | string
> & { code: string };

/** YES/NO balance evidence frozen at one chain observation boundary. */
export interface SettlementTokenBalance {
  raw_balance: string;
  shares: SharesString;
  token_id: string;
}

export interface SettlementBalanceEvidence {
  no: SettlementTokenBalance;
  yes: SettlementTokenBalance;
}

export interface SettlementRouteReadinessView {
  advisories: SettlementDeploymentAdvisory[];
  authority: SettlementDeploymentProvenanceView;
  blocking_reasons: SettlementReadinessReason[];
  checked_at: IsoDateTime;
  corroboration: null | SettlementDeploymentProvenanceView;
  deployment_digest: null | string;
  deployment_evidence_version: string;
  observed_block_hash: null | string;
  observed_block_number: null | number;
  operator_approved: boolean | null;
  route: SettlementRoute;
  runtime_code_hash: string;
  status: SettlementReadinessStatus;
  target_adapter: string;
  wallet_kind: string;
}

export interface SettlementReadinessView {
  routes: SettlementRouteReadinessView[];
  settlement_write_policy: SettlementWritePolicy;
}

/** One contributor in the exact immutable inventory governing admission. */
export interface SettlementInventoryLotView {
  contributor_lots_digest: string;
  cost_basis_usd: UsdString;
  created_at: IsoDateTime;
  execution_account_id: UuidString;
  intent_version_at: IsoDateTime;
  inventory_digest: string;
  order_intent_id: UuidString;
  strategy_position_lot_id: UuidString;
  position_version_at: IsoDateTime;
  redeem_policy: RedeemPolicy;
  settlement_inventory_lot_id: UuidString;
  settlement_mode: ExitSettlementMode;
  settlement_redeem_id: UuidString;
  shares: SharesString;
  side: OutcomeSide;
  token_id: string;
}

/** One redeemed lot within a settlement-redeem batch. */
export interface SettlementRedeemLotView {
  cost_basis_usd: UsdString;
  created_at: IsoDateTime;
  order_intent_id: UuidString;
  payout_usd: UsdString;
  strategy_position_lot_id: UuidString;
  realized_pnl_usd: UsdString;
  settlement_redeem_id: UuidString;
  settlement_redeem_lot_id: UuidString;
  shares_redeemed: SharesString;
  side: OutcomeSide;
  token_id: string;
}

export interface SettlementMinedCallEvidence {
  inner_calldata_hash: string;
  inner_target: string;
  outer_calldata_hash: string;
  outer_sender: string;
  outer_target: string;
  wallet_kind: ExecutionWalletKind;
}

export interface SettlementRedeemReceiptEvidence {
  block_hash: string;
  block_number: number;
  call: SettlementMinedCallEvidence;
  canonical_checked_at: IsoDateTime;
  chain_id: number;
  finalized_block_number: number;
  finalized_block_hash: string;
  observed_at: IsoDateTime;
  pusd_mint: {
    amount_usd: UsdString;
    from: string;
    log_index: number;
    raw_amount: string;
    to: string;
    token: string;
  };
  receipt_success: boolean;
  transaction_hash: string;
  wrapped_payout: {
    amount_usd: UsdString;
    asset: string;
    caller: string;
    collateral_token: string;
    log_index: number;
    raw_amount: string;
    to: string;
  };
}

export interface SettlementOperatorApprovalReceiptEvidence {
  block_hash: string;
  block_number: number;
  call: SettlementMinedCallEvidence;
  canonical_checked_at: IsoDateTime;
  chain_id: number;
  desired_approval: boolean;
  finalized_block_hash: string;
  finalized_block_number: number;
  observed_at: IsoDateTime;
  operator_approved: boolean;
  receipt_success: boolean;
  transaction_hash: string;
}

export type SettlementChainReceiptEvidence =
  | {
      evidence: SettlementOperatorApprovalReceiptEvidence;
      kind: 'operator_approval';
    }
  | {
      evidence: SettlementRedeemReceiptEvidence;
      kind: 'redeem';
    };

export interface SettlementFailureEvidence {
  code: string;
  detail: string;
  observed_at: IsoDateTime;
}

export interface SettlementFailureHistory {
  entries: SettlementFailureEvidence[];
}

export interface SettlementChainSubmissionView {
  attempt_ordinal: number;
  canary_action_id: null | UuidString;
  call_target: string;
  calldata_hash: string;
  chain_hash_observed_at: IsoDateTime | null;
  confirmed_at: IsoDateTime | null;
  created_at: IsoDateTime;
  deployment_digest: string;
  deployment_evidence_version: string;
  dispatched_at: IsoDateTime | null;
  failure_code: null | string;
  failure_history: SettlementFailureHistory;
  kind: SettlementSubmissionKind;
  last_error: null | string;
  prepared_block_hash: null | string;
  prepared_block_number: null | number;
  purpose: SettlementSubmissionPurpose;
  receipt_evidence: null | SettlementChainReceiptEvidence;
  relayer_transaction_id: null | string;
  route: SettlementRoute;
  settlement_chain_submission_id: UuidString;
  settlement_governed_action_id: null | UuidString;
  settlement_redeem_id: null | UuidString;
  state: SettlementSubmissionState;
  target_adapter: string;
  target_code_hash: string;
  transaction_hash: null | string;
  updated_at: IsoDateTime;
  verified_block_hash: string;
  verified_block_number: number;
}

/** `GET /quant/settlement-redeems` row header. */
export interface SettlementRedeemView {
  actual_payout_usd: null | UsdString;
  attempt_count: number;
  authorization_consumed_at: IsoDateTime | null;
  authorization_digest: null | string;
  authorization_expires_at: IsoDateTime | null;
  authorization_revoked_at: IsoDateTime | null;
  authorization_state: SettlementAuthorizationState;
  authorized_at: IsoDateTime | null;
  authorized_by: null | UuidString;
  balance_after: null | SettlementBalanceEvidence;
  balance_before: null | SettlementBalanceEvidence;
  confirmed_at: IsoDateTime | null;
  contributor_lots_digest: string;
  created_at: IsoDateTime;
  deployment_digest: null | string;
  deployment_evidence_version: null | string;
  effective_policy: SettlementEffectivePolicy;
  execution_account_id: UuidString;
  expected_payout_usd: null | UsdString;
  failed_at: IsoDateTime | null;
  failure_code: null | string;
  funder_address: string;
  gas_fee_pol: DecimalString | null;
  inventory_digest: string;
  inventory_lot_count: number;
  last_error: null | string;
  market_id: string;
  next_attempt_at: IsoDateTime | null;
  no_token_id: string;
  readiness_advisories: SettlementDeploymentAdvisory[];
  readiness_reasons: SettlementReadinessReason[];
  readiness_status: SettlementReadinessStatus;
  reconciliation_state: SettlementReconciliationState;
  route: SettlementRoute;
  settlement_redeem_id: UuidString;
  state: SettlementCaseState;
  submitted_at: IsoDateTime | null;
  target_adapter: null | string;
  target_code_hash: null | string;
  updated_at: IsoDateTime;
  verified_block_hash: null | string;
  verified_block_number: null | number;
  wallet_kind: ExecutionWalletKind;
  yes_token_id: string;
}

/** `GET /quant/settlement-redeems/{id}` — inventory, payouts, and submissions. */
export interface SettlementRedeemDetailView extends SettlementRedeemView {
  inventory_lots: SettlementInventoryLotView[];
  redeemed_lots: SettlementRedeemLotView[];
  submissions: SettlementChainSubmissionView[];
}

export interface SettlementRedeemListQuery extends PageQuery, TimeRangeQuery {
  market_id?: string;
  state?: SettlementCaseState;
}

export interface SettlementAuthorizationRequest {
  digest: string;
  reason: string;
}

export interface SettlementOperatorApprovalPreflightRequest {
  desired_approval: boolean;
  route: SettlementRoute;
}

export interface SettlementCanaryPreflightRequest {
  maximum_payout_usd: UsdString;
  route: SettlementRoute;
  settlement_redeem_id: UuidString;
}

export interface SettlementGovernedActionApplyRequest {
  idempotency_key: string;
  preflight_token: string;
  reason: string;
  scope: SettlementGovernedActionScope;
}

export type SettlementGovernedAction =
  | 'canary'
  | 'operator_approval'
  | 'operator_revocation';

export type SettlementGovernedActionBlockReason =
  | 'authorization_policy_mismatch'
  | 'canary_payout_limit_exceeded'
  | 'deployment_not_ready'
  | 'execution_not_quiescent'
  | 'manual_only_inventory'
  | 'operator_approval_already_satisfied'
  | 'operator_approval_required'
  | 'operator_authorization_required'
  | 'settlement_authorization_not_approved'
  | 'settlement_case_not_found'
  | 'settlement_case_scope_mismatch'
  | 'settlement_write_policy_disabled';

export type SettlementGovernedActionScope =
  | {
      action: 'canary';
      authorization_digest: string;
      deployment_digest: string;
      deployment_evidence_version: string;
      execution_account_id: UuidString;
      expires_at: IsoDateTime;
      maximum_payout_usd: UsdString;
      route: SettlementRoute;
      settlement_redeem_id: UuidString;
      target_adapter: string;
      wallet_kind: ExecutionWalletKind;
    }
  | {
      action: 'operator_approval';
      deployment_digest: string;
      deployment_evidence_version: string;
      desired_approval: boolean;
      execution_account_id: UuidString;
      expires_at: IsoDateTime;
      route: SettlementRoute;
      target_adapter: string;
      wallet_kind: ExecutionWalletKind;
    };

export interface SettlementGovernedActionPreflightView {
  action: SettlementGovernedAction;
  allowed: boolean;
  blocking_reasons: SettlementGovernedActionBlockReason[];
  expires_at: IsoDateTime | null;
  preflight_token: null | string;
  readiness: SettlementReadinessView;
  scope: null | SettlementGovernedActionScope;
}

export interface SettlementGovernedActionRevokeRequest {
  reason: string;
  scope_digest: string;
}

export interface SettlementGovernedActionView {
  authorization_digest: null | string;
  authorization_reason: string;
  authorized_at: IsoDateTime;
  authorized_by: UuidString;
  consumed_at: IsoDateTime | null;
  created_at: IsoDateTime;
  deployment_digest: null | string;
  deployment_evidence_version: null | string;
  desired_approval: boolean | null;
  execution_account_id: UuidString;
  expires_at: IsoDateTime;
  failure_code: null | string;
  idempotency_key: string;
  kind: SettlementGovernedActionKind;
  last_error: null | string;
  next_attempt_at: IsoDateTime | null;
  payout_ceiling_usd: null | UsdString;
  retry_count: number;
  revocation_reason: null | string;
  revoked_at: IsoDateTime | null;
  revoked_by: null | UuidString;
  route: null | SettlementRoute;
  scope_digest: string;
  settlement_governed_action_id: UuidString;
  settlement_redeem_id: null | UuidString;
  state: SettlementGovernedActionState;
  target_adapter: null | string;
  updated_at: IsoDateTime;
  verified_block_hash: null | string;
  verified_block_number: null | number;
}

export interface SettlementGovernedActionDetailView extends SettlementGovernedActionView {
  submission: null | SettlementChainSubmissionView;
}

export interface SettlementGovernedActionListQuery extends PageQuery {
  kind?: SettlementGovernedActionKind;
  state?: SettlementGovernedActionState;
}
