import type {
  AcknowledgeBasisAlertRequest,
  ActivateCalibrationArtifactRequest,
  BasisAlertListQuery,
  BasisAlertView,
  BiasTableDetailView,
  BiasTableListQuery,
  BiasTableSummaryView,
  CalibrationArtifactDetailView,
  CalibrationArtifactSummaryView,
  DomainSourceCursorView,
  LinkageResolveSummaryView,
  MarketLinkageDetailView,
  MarketLinkageHistoryEntryView,
  MarketLinkageListQuery,
  MarketLinkageSummaryView,
  MarketPriceBiasPayload,
  NegRiskEventDriftView,
  OverrideLinkageRequest,
  Paginated,
  ParticipantConcentrationDetailView,
  ParticipantConcentrationSummaryView,
  ResolveLinkagesRequest,
  TradeTapeCoverageView,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import {
  activateCalibrationArtifact,
  getCalibrationArtifact,
  listCalibrationArtifacts,
} from '#/api/calibration';
import { governedPost } from '#/api/governed-request';
import { requestClient } from '#/api/request';

export {
  activateCalibrationArtifact,
  bindCalibration,
  fitBiasTable,
  fitModelCalibrator,
  getCalibrationArtifact,
  listCalibrationArtifacts,
} from '#/api/calibration';

export namespace VerticalAlphaApi {
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
  export const acknowledgeBasisAlert = (alertId: string) =>
    `/research/basis-alerts/${alertId}/acknowledge`;
}

function toBiasTableSummary(
  row: CalibrationArtifactSummaryView,
): BiasTableSummaryView {
  return {
    ...row,
    bias_table_id: row.artifact_id,
    category_count: 0,
    total_sample_count: row.sample_count,
  };
}

function toBiasTableDetail(
  detail: CalibrationArtifactDetailView,
): BiasTableDetailView {
  const byCategory =
    detail.kind === 'market_price_bias'
      ? (detail.payload_json as MarketPriceBiasPayload)
      : {};
  return {
    artifact_id: detail.artifact_id,
    bias_table_id: detail.artifact_id,
    content_hash: detail.content_hash,
    fit_window_start: detail.fit_window_start,
    fit_window_end: detail.fit_window_end,
    calibration_split_hash: detail.calibration_split_hash,
    sample_count: detail.sample_count,
    active: detail.active,
    created_at: detail.created_at,
    category_count: Object.keys(byCategory).length,
    total_sample_count: detail.sample_count,
    by_category: byCategory,
  };
}

/** @deprecated Use {@link listCalibrationArtifacts}. */
export async function listBiasTables(query: BiasTableListQuery = {}) {
  const page = await listCalibrationArtifacts({
    ...query,
    kind: 'market_price_bias',
  });
  return {
    ...page,
    items: page.items.map((row) => toBiasTableSummary(row)),
  } satisfies Paginated<BiasTableSummaryView>;
}

/** @deprecated Use {@link getCalibrationArtifact}. */
export async function getBiasTable(id: string) {
  return toBiasTableDetail(await getCalibrationArtifact(id));
}

/** @deprecated Use {@link activateCalibrationArtifact}. */
export async function activateBiasTable(
  id: string,
  body: ActivateCalibrationArtifactRequest,
  ctx: GovernedContext,
) {
  return activateCalibrationArtifact(id, body, ctx);
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

/** `POST /research/basis-alerts/{alert_id}/acknowledge` — audited triage
 * (R6 review-queue closed loop). */
export async function acknowledgeBasisAlert(
  alertId: string,
  body: AcknowledgeBasisAlertRequest,
  ctx: GovernedContext,
) {
  return governedPost<BasisAlertView>(
    VerticalAlphaApi.acknowledgeBasisAlert(alertId),
    body,
    ctx,
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
