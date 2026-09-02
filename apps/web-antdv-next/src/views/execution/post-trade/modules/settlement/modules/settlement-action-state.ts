import type {
  SettlementGovernedActionState,
  SettlementRedeemView,
} from '@vben/types';

export type SettlementAuthorizationAction = 'approve' | 'revoke';

/** Exact operator authorization action visible for the current case state. */
export function settlementAuthorizationAction(
  redeem: null | SettlementRedeemView,
): null | SettlementAuthorizationAction {
  if (!redeem?.authorization_digest) {
    return null;
  }
  if (redeem.effective_policy !== 'automatic_eligible') {
    return redeem.authorization_state === 'approved' ? 'revoke' : null;
  }
  if (redeem.authorization_state === 'pending') {
    return 'approve';
  }
  if (redeem.authorization_state === 'approved') {
    return 'revoke';
  }
  return null;
}

/** A governed action is revocable only before a durable submission identity exists. */
export function isSettlementGovernedActionRevocable(
  state: SettlementGovernedActionState,
): boolean {
  return state === 'authorized' || state === 'retry_scheduled';
}

/** Exact preconditions for presenting the one-shot governed canary flow. */
export function canAuthorizeSettlementCanary(
  canCreate: boolean,
  redeem: null | SettlementRedeemView,
  payoutCeiling: string,
): boolean {
  return (
    canCreate &&
    redeem?.effective_policy === 'automatic_eligible' &&
    redeem?.authorization_state === 'approved' &&
    Boolean(redeem.authorization_digest) &&
    payoutCeiling.trim().length > 0
  );
}
