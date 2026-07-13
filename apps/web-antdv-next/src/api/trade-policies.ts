import type {
  FitTradePolicyRequest,
  Paginated,
  ResearchJobView,
  TradePolicyAuditListQuery,
  TradePolicyDetailView,
  TradePolicyFitPreflightRequest,
  TradePolicyFitPreflightView,
  TradePolicyGovernanceAuditView,
  TradePolicyGovernanceRequest,
  TradePolicyListQuery,
  TradePolicySummaryView,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { governedPost } from '#/api/governed-request';
import { requestClient } from '#/api/request';

const base = '/research/trade-policies';

export async function listTradePolicies(query: TradePolicyListQuery = {}) {
  return requestClient.get<Paginated<TradePolicySummaryView>>(base, {
    params: query,
  });
}

export async function getTradePolicy(id: string) {
  return requestClient.get<TradePolicyDetailView>(`${base}/${id}`);
}

export async function listTradePolicyAudits(
  id: string,
  query: TradePolicyAuditListQuery = {},
) {
  return requestClient.get<Paginated<TradePolicyGovernanceAuditView>>(
    `${base}/${id}/audits`,
    { params: query },
  );
}

export async function preflightTradePolicy(
  body: TradePolicyFitPreflightRequest,
) {
  return requestClient.post<TradePolicyFitPreflightView>(
    `${base}/preflight`,
    body,
  );
}

export async function fitTradePolicy(
  body: FitTradePolicyRequest,
  context: GovernedContext,
) {
  return governedPost<ResearchJobView>(`${base}/fit`, body, context);
}

export async function governTradePolicy(
  id: string,
  action: 'publish' | 'retire' | 'validate',
  body: TradePolicyGovernanceRequest,
  context: GovernedContext,
) {
  return governedPost<TradePolicyDetailView>(
    `${base}/${id}/${action}`,
    body,
    context,
  );
}
