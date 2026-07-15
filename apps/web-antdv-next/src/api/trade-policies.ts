import type {
  FitTradePolicyRequest,
  Paginated,
  ResearchJobView,
  ResearchProfileArtifact,
  TradePolicyAuditListQuery,
  TradePolicyDetailView,
  TradePolicyEvidenceDownloadView,
  TradePolicyEvidenceObjectKind,
  TradePolicyFitPreflightRequest,
  TradePolicyFitPreflightView,
  TradePolicyGovernanceAuditView,
  TradePolicyGovernanceRequest,
  TradePolicyListQuery,
  TradePolicySourceSliceObjectListQuery,
  TradePolicySourceSliceObjectView,
  TradePolicySourceSliceView,
  TradePolicySummaryView,
  TradePolicyTrialAttemptView,
  TradePolicyTrialListQuery,
  TradePolicyValidationListQuery,
  TradePolicyValidationRowListQuery,
  TradePolicyValidationRowView,
  TradePolicyValidationRunView,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { governedPost } from '#/api/governed-request';
import { requestClient } from '#/api/request';

const base = '/research/trade-policies';
const fitBase = '/research/trade-policy-fits';
const profileBase = '/research/trade-policy-profiles';

export async function listTradePolicyProfiles() {
  return requestClient.get<ResearchProfileArtifact[]>(profileBase);
}

export async function getTradePolicyProfile(id: string, version: number) {
  return requestClient.get<ResearchProfileArtifact>(
    `${profileBase}/${encodeURIComponent(id)}/${version}`,
  );
}

export async function listTradePolicies(query: TradePolicyListQuery = {}) {
  return requestClient.get<Paginated<TradePolicySummaryView>>(base, {
    params: query,
  });
}

export async function getTradePolicy(id: string) {
  return requestClient.get<TradePolicyDetailView>(`${base}/${id}`);
}

export async function getTradePolicySourceSlice(id: string) {
  return requestClient.get<TradePolicySourceSliceView>(
    `${base}/${id}/source-slice`,
  );
}

export async function listTradePolicySourceSliceObjects(
  id: string,
  query: TradePolicySourceSliceObjectListQuery = {},
) {
  return requestClient.get<Paginated<TradePolicySourceSliceObjectView>>(
    `${base}/${id}/source-slice/objects`,
    { params: query },
  );
}

export async function getTradePolicyEvidenceDownload(
  id: string,
  kind: TradePolicyEvidenceObjectKind,
) {
  return requestClient.get<TradePolicyEvidenceDownloadView>(
    `${base}/${id}/evidence/${kind}/download`,
  );
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
    `${fitBase}/preflight`,
    body,
  );
}

export async function fitTradePolicy(
  body: FitTradePolicyRequest,
  context: GovernedContext,
) {
  return governedPost<ResearchJobView>(fitBase, body, context);
}

export async function getTradePolicyFit(id: string) {
  return requestClient.get<ResearchJobView>(`${fitBase}/${id}`);
}

export async function listTradePolicyFitTrials(
  id: string,
  query: TradePolicyTrialListQuery = {},
) {
  return requestClient.get<Paginated<TradePolicyTrialAttemptView>>(
    `${fitBase}/${id}/trials`,
    { params: query },
  );
}

export async function listTradePolicyValidations(
  id: string,
  query: TradePolicyValidationListQuery = {},
) {
  return requestClient.get<Paginated<TradePolicyValidationRunView>>(
    `${base}/${id}/validations`,
    { params: query },
  );
}

export async function getTradePolicyValidation(id: string) {
  return requestClient.get<TradePolicyValidationRunView>(
    `/research/trade-policy-validations/${id}`,
  );
}

export async function listTradePolicyValidationRows(
  id: string,
  query: TradePolicyValidationRowListQuery = {},
) {
  return requestClient.get<Paginated<TradePolicyValidationRowView>>(
    `/research/trade-policy-validations/${id}/rows`,
    { params: query },
  );
}

export async function validateTradePolicy(
  id: string,
  body: TradePolicyGovernanceRequest,
  context: GovernedContext,
) {
  return governedPost<ResearchJobView>(`${base}/${id}/validate`, body, context);
}

export async function governTradePolicy(
  id: string,
  action: 'publish' | 'retire',
  body: TradePolicyGovernanceRequest,
  context: GovernedContext,
) {
  return governedPost<TradePolicyDetailView>(
    `${base}/${id}/${action}`,
    body,
    context,
  );
}
