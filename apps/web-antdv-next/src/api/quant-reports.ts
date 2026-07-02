import type {
  Paginated,
  QuantRecommendationView,
  QuantReportDetailView,
  QuantReportListQuery,
  QuantReportView,
  ReportDiffView,
  RevokeReportRequest,
  RunReportAccepted,
  RunReportRequest,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { governedPost } from '#/api/governed-request';
import { requestClient } from '#/api/request';

export namespace QuantReportApi {
  export const base = '/quant/reports';
  export const latest = `${base}/latest`;
  export const run = `${base}/run`;
  export const detail = (id: string) => `${base}/${id}`;
  export const recommendations = (id: string) =>
    `${base}/${id}/recommendations`;
  export const diff = (id: string, otherId: string) =>
    `${base}/${id}/diff/${otherId}`;
  export const revoke = (id: string) => `${base}/${id}/revoke`;
}

/** `GET /quant/reports` — paginated, filtered report list. */
export async function listQuantReports(query: QuantReportListQuery = {}) {
  return requestClient.get<Paginated<QuantReportView>>(QuantReportApi.base, {
    params: query,
  });
}

/** `GET /quant/reports/latest` — the newest published report detail. */
export async function getLatestQuantReport() {
  return requestClient.get<QuantReportDetailView>(QuantReportApi.latest);
}

/** `GET /quant/reports/{id}` — full report detail with summary. */
export async function getQuantReport(id: string) {
  return requestClient.get<QuantReportDetailView>(QuantReportApi.detail(id));
}

/** `GET /quant/reports/{id}/recommendations` — the report's ranked TopN. */
export async function listReportRecommendations(id: string) {
  return requestClient.get<QuantRecommendationView[]>(
    QuantReportApi.recommendations(id),
  );
}

/** `GET /quant/reports/{id}/diff/{other_id}` — recommendation-level diff. */
export async function getReportDiff(id: string, otherId: string) {
  return requestClient.get<ReportDiffView>(QuantReportApi.diff(id, otherId));
}

/** `POST /quant/reports/run` — governed ad-hoc report enqueue (202). */
export async function runQuantReport(
  body: RunReportRequest,
  ctx: GovernedContext,
) {
  return governedPost<RunReportAccepted>(QuantReportApi.run, body, ctx);
}

/** `POST /quant/reports/{id}/revoke` — governed report revocation. */
export async function revokeQuantReport(
  id: string,
  body: RevokeReportRequest,
  ctx: GovernedContext,
) {
  return governedPost<QuantReportDetailView>(
    QuantReportApi.revoke(id),
    body,
    ctx,
  );
}
