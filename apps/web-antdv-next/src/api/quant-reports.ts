import type {
  OperationLogView,
  Paginated,
  QuantRecommendationView,
  QuantReportDetailView,
  QuantReportDiagnosticsView,
  QuantReportFunnelView,
  QuantReportListQuery,
  QuantReportView,
  ReportDiffView,
  ReportFactDeliveryView,
  ReportFunnelMarketListQuery,
  ReportFunnelMarketView,
  ReportRunListQuery,
  ReportRunView,
  ReportScheduleGapListQuery,
  ReportScheduleGapView,
  ReportScheduleHealthView,
  RetryReportRequest,
  RevokeReportRequest,
  RunReportRequest,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { governedPost } from '#/api/governed-request';
import { requestClient } from '#/api/request';

export namespace QuantReportApi {
  export const base = '/quant/reports';
  export const run = `${base}/run`;
  export const runs = '/quant/report-runs';
  export const runDetail = (id: string) => `${runs}/${id}`;
  export const runRetry = (id: string) => `${runs}/${id}/retry`;
  export const scheduleHealth = '/quant/report-schedules/health';
  export const scheduleGaps = '/quant/report-schedule-gaps';
  export const detail = (id: string) => `${base}/${id}`;
  export const recommendations = (id: string) =>
    `${base}/${id}/recommendations`;
  export const diagnostics = (id: string) => `${base}/${id}/diagnostics`;
  export const diff = (id: string, otherId: string) =>
    `${base}/${id}/diff/${otherId}`;
  export const funnel = (id: string) => `${base}/${id}/funnel`;
  export const funnelMarkets = (id: string) => `${base}/${id}/funnel/markets`;
  export const revoke = (id: string) => `${base}/${id}/revoke`;
  export const publicationRetry = (id: string) =>
    `${base}/${id}/publication/retry`;
  export const timeline = (id: string) => `${base}/${id}/timeline`;
}

/** `GET /quant/reports` — paginated, filtered report list. */
export async function listQuantReports(query: QuantReportListQuery = {}) {
  return requestClient.get<Paginated<QuantReportView>>(QuantReportApi.base, {
    params: query,
  });
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

/** `GET /quant/reports/{id}/diagnostics` — durable serving evidence summary. */
export async function getQuantReportDiagnostics(id: string) {
  return requestClient.get<QuantReportDiagnosticsView>(
    QuantReportApi.diagnostics(id),
  );
}

/** `GET /quant/reports/{id}/funnel` — row-derived conservation summary. */
export async function getQuantReportFunnel(id: string) {
  return requestClient.get<QuantReportFunnelView>(QuantReportApi.funnel(id));
}

/** `GET /quant/reports/{id}/funnel/markets` — typed terminal market decisions. */
export async function listQuantReportFunnelMarkets(
  id: string,
  query: ReportFunnelMarketListQuery = {},
) {
  return requestClient.get<Paginated<ReportFunnelMarketView>>(
    QuantReportApi.funnelMarkets(id),
    { params: query },
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
  return governedPost<ReportRunView>(QuantReportApi.run, body, ctx);
}

export async function listReportRuns(query: ReportRunListQuery = {}) {
  return requestClient.get<Paginated<ReportRunView>>(QuantReportApi.runs, {
    params: query,
  });
}

export async function getReportRun(id: string) {
  return requestClient.get<ReportRunView>(QuantReportApi.runDetail(id));
}

export async function retryReportRun(
  id: string,
  body: RetryReportRequest,
  ctx: GovernedContext,
) {
  return governedPost<ReportRunView>(QuantReportApi.runRetry(id), body, ctx);
}

export async function getReportScheduleHealth() {
  return requestClient.get<ReportScheduleHealthView>(
    QuantReportApi.scheduleHealth,
  );
}

export async function listReportScheduleGaps(
  query: ReportScheduleGapListQuery = {},
) {
  return requestClient.get<Paginated<ReportScheduleGapView>>(
    QuantReportApi.scheduleGaps,
    { params: query },
  );
}

export async function retryReportPublication(
  id: string,
  body: RetryReportRequest,
  ctx: GovernedContext,
) {
  return governedPost<ReportFactDeliveryView>(
    QuantReportApi.publicationRetry(id),
    body,
    ctx,
  );
}

export async function getReportTimeline(
  id: string,
  query: { from?: string; page?: number; size?: number; to?: string } = {},
) {
  return requestClient.get<Paginated<OperationLogView>>(
    QuantReportApi.timeline(id),
    { params: query },
  );
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
