import type {
  EntryConditionAuditView,
  EntryConditionDetailView,
  QuantEvidenceView,
  QuantRecommendationView,
} from '@vben/types';

import { requestClient } from '#/api/request';

export namespace QuantRecommendationApi {
  export const detail = (id: string) => `/quant/recommendations/${id}`;
  export const evidence = (id: string) =>
    `/quant/recommendations/${id}/evidence`;
  export const entryCondition = (id: string) =>
    `/quant/recommendations/${id}/entry-condition`;
  export const entryConditionAudits = (id: string) =>
    `/quant/recommendations/${id}/entry-condition/audits`;
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
  return requestClient.get<QuantRecommendationView>(
    QuantRecommendationApi.detail(id),
  );
}

/** `GET /quant/recommendations/{id}/evidence` — replay-handle references. */
export async function getRecommendationEvidence(id: string) {
  return requestClient.get<QuantEvidenceView>(
    QuantRecommendationApi.evidence(id),
  );
}
