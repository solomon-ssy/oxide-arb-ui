import type {
  ActivateBiasTableRequest,
  BasisAlertListQuery,
  BasisAlertView,
  BiasTableDetailView,
  BiasTableListQuery,
  BiasTableSummaryView,
  DomainSourceCursorView,
  FitBiasTableRequest,
  LinkageResolveSummaryView,
  MarketLinkageDetailView,
  MarketLinkageHistoryEntryView,
  MarketLinkageListQuery,
  MarketLinkageSummaryView,
  NegRiskEventDriftView,
  OverrideLinkageRequest,
  Paginated,
  ParticipantConcentrationDetailView,
  ParticipantConcentrationSummaryView,
  ResearchJobView,
  ResolveLinkagesRequest,
  RuntimeConfigVersionView,
  TradeTapeCoverageView,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { governedPost } from '#/api/governed-request';
import { requestClient } from '#/api/request';

export namespace VerticalAlphaApi {
  export const biasTables = '/research/bias-tables';
  export const biasTable = (id: string) => `/research/bias-tables/${id}`;
  export const fitBiasTable = '/research/bias-tables/fit';
  export const activateBiasTable = (id: string) =>
    `/research/bias-tables/${id}/activate`;
  export const negRiskEvents = '/quant/structural/negrisk-events';
  export const tradeTapeCoverage = '/quant/structural/trade-tape/coverage';
  export const participantConcentration =
    '/quant/structural/participant-concentration';
  export const participantConcentrationMarket = (marketId: string) =>
    `/quant/structural/participant-concentration/${marketId}`;
  export const marketLinkages = '/research/market-linkages';
  export const marketLinkage = (marketId: string) =>
    `/research/market-linkages/${marketId}`;
  export const resolveMarketLinkages = '/research/market-linkages/resolve';
  export const overrideMarketLinkage = (marketId: string) =>
    `/research/market-linkages/${marketId}/override`;
  export const marketLinkageHistory = (marketId: string) =>
    `/research/market-linkages/${marketId}/history`;
  export const domainSources = '/research/domain-sources';
  export const basisAlerts = '/research/basis-alerts';
}

/** `GET /research/bias-tables` — paginated favorite-longshot bias-table catalog. */
export async function listBiasTables(query: BiasTableListQuery = {}) {
  return requestClient.get<Paginated<BiasTableSummaryView>>(
    VerticalAlphaApi.biasTables,
    { params: query },
  );
}

/** `GET /research/bias-tables/{id}` — full per-category curve detail. */
export async function getBiasTable(id: string) {
  return requestClient.get<BiasTableDetailView>(VerticalAlphaApi.biasTable(id));
}

/** `POST /research/bias-tables/fit` — enqueue an async bias-table fit job. */
export async function fitBiasTable(
  body: FitBiasTableRequest,
  ctx: GovernedContext,
) {
  return governedPost<ResearchJobView>(
    VerticalAlphaApi.fitBiasTable,
    body,
    ctx,
  );
}

/**
 * `POST /research/bias-tables/{id}/activate` — stage a runtime-config version
 * pinning this table as the favorite-longshot bias source. The operator then
 * activates that version through the runtime-config governance flow.
 */
export async function activateBiasTable(
  id: string,
  body: ActivateBiasTableRequest,
  ctx: GovernedContext,
) {
  return governedPost<RuntimeConfigVersionView>(
    VerticalAlphaApi.activateBiasTable(id),
    body,
    ctx,
  );
}

/** `GET /research/market-linkages` — paginated linkage ledger catalog. */
export async function listMarketLinkages(query: MarketLinkageListQuery = {}) {
  return requestClient.get<Paginated<MarketLinkageSummaryView>>(
    VerticalAlphaApi.marketLinkages,
    { params: query },
  );
}

/** `GET /research/market-linkages/{market_id}` — latest PIT-valid linkage. */
export async function getMarketLinkage(marketId: string) {
  return requestClient.get<MarketLinkageDetailView>(
    VerticalAlphaApi.marketLinkage(marketId),
  );
}

/** `GET /research/market-linkages/{market_id}/history` — the full ledger
 * history for one market, oldest first (the audit trail). */
export async function getMarketLinkageHistory(marketId: string) {
  return requestClient.get<MarketLinkageHistoryEntryView[]>(
    VerticalAlphaApi.marketLinkageHistory(marketId),
  );
}

/** `POST /research/market-linkages/resolve` — trigger offline re-resolution. */
export async function resolveMarketLinkages(
  body: ResolveLinkagesRequest,
  ctx: GovernedContext,
) {
  return governedPost<LinkageResolveSummaryView>(
    VerticalAlphaApi.resolveMarketLinkages,
    body,
    ctx,
  );
}

/** `POST /research/market-linkages/{market_id}/override` — audited override. */
export async function overrideMarketLinkage(
  marketId: string,
  body: OverrideLinkageRequest,
  ctx: GovernedContext,
) {
  return governedPost<MarketLinkageDetailView>(
    VerticalAlphaApi.overrideMarketLinkage(marketId),
    body,
    ctx,
  );
}

/** `GET /research/domain-sources` — domain ingest cursor health. */
export async function listDomainSources() {
  return requestClient.get<DomainSourceCursorView[]>(
    VerticalAlphaApi.domainSources,
  );
}

/** `GET /research/basis-alerts` — paginated basis-cross-check exceedance feed. */
export async function listBasisAlerts(query: BasisAlertListQuery = {}) {
  return requestClient.get<Paginated<BasisAlertView>>(
    VerticalAlphaApi.basisAlerts,
    { params: query },
  );
}

/** `GET /quant/structural/negrisk-events` — live neg-risk leg-sum drift. */
export async function listNegRiskEvents() {
  return requestClient.get<NegRiskEventDriftView[]>(
    VerticalAlphaApi.negRiskEvents,
  );
}

/** `GET /quant/structural/trade-tape/coverage` — source coverage and lag. */
export async function getTradeTapeCoverage() {
  return requestClient.get<TradeTapeCoverageView>(
    VerticalAlphaApi.tradeTapeCoverage,
  );
}

/** `GET /quant/structural/participant-concentration` — top concentrated markets. */
export async function getParticipantConcentration() {
  return requestClient.get<ParticipantConcentrationSummaryView>(
    VerticalAlphaApi.participantConcentration,
  );
}

/** `GET /quant/structural/participant-concentration/{market_id}` — participant detail. */
export async function getParticipantConcentrationMarket(marketId: string) {
  return requestClient.get<null | ParticipantConcentrationDetailView>(
    VerticalAlphaApi.participantConcentrationMarket(marketId),
  );
}
