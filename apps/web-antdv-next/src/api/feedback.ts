import type {
  ActivateModelRouteRequest,
  BootstrapModelRouteRequest,
  CancelFeedbackCycleRequest,
  DriftReportListQuery,
  DriftReportView,
  FeedbackCycleDetailView,
  FeedbackCycleListQuery,
  FeedbackCycleMutationView,
  FeedbackCycleTriggerRequest,
  FeedbackCycleTriggerView,
  FeedbackCycleView,
  FeedbackOverviewView,
  FeedbackSchedulerControlRequest,
  FeedbackSchedulerListView,
  FeedbackSchedulerMutationView,
  IssuePromotionPermitRequest,
  ModelRouteActivationMutationView,
  ModelRouteActivationReceiptView,
  ModelRouteBootstrapReceiptView,
  Paginated,
  PromotionPermitListQuery,
  PromotionPermitMutationView,
  PromotionPermitView,
  RejectShadowBindingRequest,
  RemediateResolutionProjectionRequest,
  ResolutionProjectionRemediationView,
  RevokePromotionPermitRequest,
  ShadowBindingRejectionReceiptView,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { withSilentError } from '@vben/request/qp';

import { governedPost } from '#/api/governed-request';
import { requestClient } from '#/api/request';

export namespace FeedbackApi {
  export const activations = '/research/model-route-activations';
  export const bootstraps = '/research/model-route-bootstraps';
  export const overview = '/research/feedback-overview';
  export const permits = '/research/model-route-activation-permits';
  export const shadowBindings = '/research/model-route-shadow-bindings';
  export const resolutionProjections = '/research/resolution-projections';
  export const cycles = '/research/feedback-cycles';
  export const driftReports = '/research/drift-reports';
  export const schedulers = '/research/feedback-schedulers';
}

/** Page immutable drift evidence across feedback cycles and profiles. */
export async function listDriftReports(
  query: DriftReportListQuery = {},
  options: FeedbackReadOptions = {},
) {
  return requestClient.get<Paginated<DriftReportView>>(
    FeedbackApi.driftReports,
    withSilentError({ params: query, signal: options.signal }),
  );
}

export interface FeedbackReadOptions {
  signal?: AbortSignal;
}

/** Read the authoritative feedback overview snapshot. */
export async function getFeedbackOverview(options: FeedbackReadOptions = {}) {
  return requestClient.get<FeedbackOverviewView>(
    FeedbackApi.overview,
    withSilentError({ signal: options.signal }),
  );
}

/** Page the durable feedback-cycle ledger. */
export async function listFeedbackCycles(
  query: FeedbackCycleListQuery = {},
  options: FeedbackReadOptions = {},
) {
  return requestClient.get<Paginated<FeedbackCycleView>>(
    FeedbackApi.cycles,
    withSilentError({
      params: query,
      signal: options.signal,
    }),
  );
}

/** Read one authoritative feedback-cycle detail snapshot. */
export async function getFeedbackCycle(
  cycleId: string,
  options: FeedbackReadOptions = {},
) {
  return requestClient.get<FeedbackCycleDetailView>(
    `${FeedbackApi.cycles}/${encodeURIComponent(cycleId)}`,
    withSilentError({
      signal: options.signal,
    }),
  );
}

/** Trigger one server-frozen manual cycle through real governed RBAC. */
export async function triggerFeedbackCycle(
  body: FeedbackCycleTriggerRequest,
  context: GovernedContext,
) {
  return governedPost<FeedbackCycleTriggerView>(
    FeedbackApi.cycles,
    body,
    context,
  );
}

/** Request cancellation; the coordinator remains the lifecycle owner. */
export async function cancelFeedbackCycle(
  cycleId: string,
  body: CancelFeedbackCycleRequest,
  context: GovernedContext,
) {
  return governedPost<FeedbackCycleMutationView>(
    `${FeedbackApi.cycles}/${encodeURIComponent(cycleId)}/cancel`,
    body,
    context,
  );
}

/** Page server-derived promotion permits. */
export async function listPromotionPermits(
  query: PromotionPermitListQuery = {},
  options: FeedbackReadOptions = {},
) {
  return requestClient.get<Paginated<PromotionPermitView>>(
    FeedbackApi.permits,
    withSilentError({
      params: query,
      signal: options.signal,
    }),
  );
}

/** Issue bounded promotion authority; this does not promote a route. */
export async function issuePromotionPermit(
  body: IssuePromotionPermitRequest,
  context: GovernedContext,
) {
  return governedPost<PromotionPermitMutationView>(
    FeedbackApi.permits,
    body,
    context,
  );
}

/** Revoke the sole active permit revision through server-side CAS. */
export async function revokePromotionPermit(
  permitId: string,
  body: RevokePromotionPermitRequest,
  context: GovernedContext,
) {
  return governedPost<PromotionPermitMutationView>(
    `${FeedbackApi.permits}/${encodeURIComponent(permitId)}/revoke`,
    body,
    context,
  );
}

/** Read PostgreSQL-authoritative automatic retraining scheduler state. */
export async function listFeedbackSchedulers(
  options: FeedbackReadOptions = {},
) {
  return requestClient.get<FeedbackSchedulerListView>(
    FeedbackApi.schedulers,
    withSilentError({ signal: options.signal }),
  );
}

/** Pause one scheduler profile through pause-revision CAS. */
export async function pauseFeedbackScheduler(
  profileId: string,
  body: FeedbackSchedulerControlRequest,
  context: GovernedContext,
) {
  return governedPost<FeedbackSchedulerMutationView>(
    `${FeedbackApi.schedulers}/${encodeURIComponent(profileId)}/pause`,
    body,
    context,
  );
}

/** Resume one scheduler profile through pause-revision CAS. */
export async function resumeFeedbackScheduler(
  profileId: string,
  body: FeedbackSchedulerControlRequest,
  context: GovernedContext,
) {
  return governedPost<FeedbackSchedulerMutationView>(
    `${FeedbackApi.schedulers}/${encodeURIComponent(profileId)}/resume`,
    body,
    context,
  );
}

/** Atomically consume one active permit and return its durable route receipt. */
export async function activateModelRoute(
  body: ActivateModelRouteRequest,
  context: GovernedContext,
) {
  return governedPost<ModelRouteActivationMutationView>(
    FeedbackApi.activations,
    body,
    context,
  );
}

/** Read one immutable activation and its server-sanitized rollback target. */
export async function getModelRouteActivation(
  activationId: string,
  options: FeedbackReadOptions = {},
) {
  return requestClient.get<ModelRouteActivationReceiptView>(
    `${FeedbackApi.activations}/${encodeURIComponent(activationId)}`,
    withSilentError({ signal: options.signal }),
  );
}

/** Reject one exact CandidateReady shadow binding and release its route slot. */
export async function rejectShadowBinding(
  bindingId: string,
  body: RejectShadowBindingRequest,
  context: GovernedContext,
) {
  return governedPost<ShadowBindingRejectionReceiptView>(
    `${FeedbackApi.shadowBindings}/${encodeURIComponent(bindingId)}/reject`,
    body,
    context,
  );
}

/** Apply a governed exact-CAS Requeue or Exclude remediation. */
export async function remediateResolutionProjection(
  observationId: string,
  body: RemediateResolutionProjectionRequest,
  context: GovernedContext,
) {
  return governedPost<ResolutionProjectionRemediationView>(
    `${FeedbackApi.resolutionProjections}/${encodeURIComponent(
      observationId,
    )}/remediations`,
    body,
    context,
  );
}

/** Establish one server-derived first champion; never grants execution authority. */
export async function bootstrapModelRoute(
  body: BootstrapModelRouteRequest,
  context: GovernedContext,
) {
  return governedPost<ModelRouteBootstrapReceiptView>(
    FeedbackApi.bootstraps,
    body,
    context,
  );
}
