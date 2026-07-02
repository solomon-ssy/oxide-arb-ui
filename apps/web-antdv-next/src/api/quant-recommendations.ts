import type {
  QuantEvidenceView,
  QuantRecommendationView,
  RecommendationAttributionView,
} from '@vben/types';

import { requestClient } from '#/api/request';

export namespace QuantRecommendationApi {
  export const detail = (id: string) => `/quant/recommendations/${id}`;
  export const evidence = (id: string) =>
    `/quant/recommendations/${id}/evidence`;
  export const attribution = (id: string) =>
    `/quant/recommendations/${id}/attribution`;
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

/** `GET /quant/recommendations/{id}/attribution` — realized outcome. */
export async function getRecommendationAttribution(id: string) {
  return requestClient.get<RecommendationAttributionView>(
    QuantRecommendationApi.attribution(id),
  );
}
