import type {
  Paginated,
  SettlementAuthorizationRequest,
  SettlementCanaryPreflightRequest,
  SettlementGovernedActionApplyRequest,
  SettlementGovernedActionDetailView,
  SettlementGovernedActionListQuery,
  SettlementGovernedActionPreflightView,
  SettlementGovernedActionRevokeRequest,
  SettlementGovernedActionView,
  SettlementOperatorApprovalPreflightRequest,
  SettlementReadinessView,
  SettlementRedeemDetailView,
  SettlementRedeemListQuery,
  SettlementRedeemView,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { governedPost } from '#/api/governed-request';
import { requestClient } from '#/api/request';

export namespace SettlementRedeemApi {
  export const base = '/quant/settlement-redeems';
  export const canaryApply = '/quant/settlement-canaries/apply';
  export const canaryPreflight = '/quant/settlement-canaries/preflight';
  export const detail = (id: string) => `${base}/${id}`;
  export const governedActions = '/quant/settlement-governed-actions';
  export const governedActionDetail = (id: string) =>
    `${governedActions}/${id}`;
  export const operatorApprovalApply =
    '/quant/settlement-operator-approvals/apply';
  export const operatorApprovalPreflight =
    '/quant/settlement-operator-approvals/preflight';
  export const readiness = '/quant/settlement-readiness';
}

export async function getSettlementReadiness() {
  return requestClient.get<SettlementReadinessView>(
    SettlementRedeemApi.readiness,
  );
}

/** `GET /quant/settlement-redeems` — paginated redeem batch ledger. */
export async function listSettlementRedeems(
  query: SettlementRedeemListQuery = {},
) {
  return requestClient.get<Paginated<SettlementRedeemView>>(
    SettlementRedeemApi.base,
    { params: query },
  );
}

/** `GET /quant/settlement-redeems/{id}` — inventory, payouts, and submissions. */
export async function getSettlementRedeem(id: string) {
  return requestClient.get<SettlementRedeemDetailView>(
    SettlementRedeemApi.detail(id),
  );
}

export async function approveSettlementAuthorization(
  id: string,
  request: SettlementAuthorizationRequest,
  ctx: GovernedContext,
) {
  return governedPost<SettlementRedeemView>(
    `${SettlementRedeemApi.detail(id)}/approve`,
    request,
    ctx,
  );
}

export async function revokeSettlementAuthorization(
  id: string,
  request: SettlementAuthorizationRequest,
  ctx: GovernedContext,
) {
  return governedPost<SettlementRedeemView>(
    `${SettlementRedeemApi.detail(id)}/revoke-approval`,
    request,
    ctx,
  );
}

export async function preflightSettlementOperatorApproval(
  request: SettlementOperatorApprovalPreflightRequest,
) {
  return requestClient.post<SettlementGovernedActionPreflightView>(
    SettlementRedeemApi.operatorApprovalPreflight,
    request,
  );
}

export async function applySettlementOperatorApproval(
  request: SettlementGovernedActionApplyRequest,
  ctx: GovernedContext,
) {
  return governedPost<SettlementGovernedActionView>(
    SettlementRedeemApi.operatorApprovalApply,
    request,
    ctx,
  );
}

export async function preflightSettlementCanary(
  request: SettlementCanaryPreflightRequest,
) {
  return requestClient.post<SettlementGovernedActionPreflightView>(
    SettlementRedeemApi.canaryPreflight,
    request,
  );
}

export async function applySettlementCanary(
  request: SettlementGovernedActionApplyRequest,
  ctx: GovernedContext,
) {
  return governedPost<SettlementGovernedActionView>(
    SettlementRedeemApi.canaryApply,
    request,
    ctx,
  );
}

export async function listSettlementGovernedActions(
  query: SettlementGovernedActionListQuery = {},
) {
  return requestClient.get<Paginated<SettlementGovernedActionView>>(
    SettlementRedeemApi.governedActions,
    { params: query },
  );
}

export async function getSettlementGovernedAction(id: string) {
  return requestClient.get<SettlementGovernedActionDetailView>(
    SettlementRedeemApi.governedActionDetail(id),
  );
}

export async function revokeSettlementGovernedAction(
  id: string,
  request: SettlementGovernedActionRevokeRequest,
  ctx: GovernedContext,
) {
  return governedPost<SettlementGovernedActionView>(
    `${SettlementRedeemApi.governedActionDetail(id)}/revoke`,
    request,
    ctx,
  );
}
