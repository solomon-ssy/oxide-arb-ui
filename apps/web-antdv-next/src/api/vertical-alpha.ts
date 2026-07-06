import type {
  ActivateBiasTableRequest,
  BiasTableDetailView,
  BiasTableListQuery,
  BiasTableSummaryView,
  FitBiasTableRequest,
  NegRiskEventDriftView,
  Paginated,
  ResearchJobView,
  RuntimeConfigVersionView,
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

/** `GET /quant/structural/negrisk-events` — live neg-risk leg-sum drift. */
export async function listNegRiskEvents() {
  return requestClient.get<NegRiskEventDriftView[]>(
    VerticalAlphaApi.negRiskEvents,
  );
}
