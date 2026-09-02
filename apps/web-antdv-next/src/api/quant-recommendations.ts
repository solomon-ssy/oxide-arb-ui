import type {
  EntryConditionAuditView,
  EntryConditionDetailView,
  QuantEvidenceView,
  RecommendationEconomicOutcomeView,
  RecommendationExecutionComparisonView,
} from '@vben/types';

import { decodeRecommendation } from '#/api/quant-operator-contract';
import { requestClient } from '#/api/request';

export namespace QuantRecommendationApi {
  export const detail = (id: string) => `/quant/recommendations/${id}`;
  export const evidence = (id: string) =>
    `/quant/recommendations/${id}/evidence`;
  export const entryCondition = (id: string) =>
    `/quant/recommendations/${id}/entry-condition`;
  export const entryConditionAudits = (id: string) =>
    `/quant/recommendations/${id}/entry-condition/audits`;
  export const economicOutcome = (id: string) =>
    `/quant/recommendations/${id}/economic-outcome`;
  export const executionComparison = (id: string) =>
    `/quant/recommendations/${id}/execution-comparison`;
}

export async function getRecommendationEconomicOutcome(id: string) {
  return requestClient.get<null | RecommendationEconomicOutcomeView>(
    QuantRecommendationApi.economicOutcome(id),
  );
}

export async function getRecommendationExecutionComparison(id: string) {
  return requestClient.get<null | RecommendationExecutionComparisonView>(
    QuantRecommendationApi.executionComparison(id),
  );
}

/** Durable recommendation-owned entry condition and immutable artifact. */
export async function getRecommendationEntryCondition(id: string) {
  return requestClient.get<EntryConditionDetailView>(
    QuantRecommendationApi.entryCondition(id),
  );
}

/** Append-only lifecycle history for a recommendation entry condition. */
export async function getRecommendationEntryConditionAudits(id: string) {
  return requestClient.get<EntryConditionAuditView[]>(
    QuantRecommendationApi.entryConditionAudits(id),
  );
}

/** `GET /quant/recommendations/{id}` — one scored recommendation. */
export async function getRecommendation(id: string) {
  const response = await requestClient.get<unknown>(
    QuantRecommendationApi.detail(id),
  );
  return decodeRecommendation(response);
}

/** `GET /quant/recommendations/{id}/evidence` — replay-handle references. */
export async function getRecommendationEvidence(id: string) {
  return requestClient.get<QuantEvidenceView>(
    QuantRecommendationApi.evidence(id),
  );
}
