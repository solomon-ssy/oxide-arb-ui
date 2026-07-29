import type {
  CancelFeedbackCycleRequest,
  FeedbackCycleDetailView,
  FeedbackCycleListQuery,
  FeedbackCycleMutationView,
  FeedbackCycleView,
  FeedbackOverviewView,
  IssuePromotionPermitRequest,
  Paginated,
  PromotionPermitListQuery,
  PromotionPermitMutationView,
  PromotionPermitView,
  RevokePromotionPermitRequest,
  TriggerFeedbackCycleRequest,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { governedPost } from '#/api/governed-request';
import { requestClient } from '#/api/request';

export namespace FeedbackApi {
  export const overview = '/research/feedback-overview';
  export const permits = '/research/feedback-promotion-permits';
  export const cycles = '/research/feedback-cycles';
}

export interface FeedbackReadOptions {
  signal?: AbortSignal;
}

/** Read the authoritative feedback overview snapshot. */
export async function getFeedbackOverview(options: FeedbackReadOptions = {}) {
  return requestClient.get<FeedbackOverviewView>(FeedbackApi.overview, {
    signal: options.signal,
  });
}

/** Page the durable feedback-cycle ledger. */
export async function listFeedbackCycles(
  query: FeedbackCycleListQuery = {},
  options: FeedbackReadOptions = {},
) {
  return requestClient.get<Paginated<FeedbackCycleView>>(FeedbackApi.cycles, {
    params: query,
    signal: options.signal,
  });
}

/** Read one authoritative feedback-cycle detail snapshot. */
export async function getFeedbackCycle(
  cycleId: string,
  options: FeedbackReadOptions = {},
) {
  return requestClient.get<FeedbackCycleDetailView>(
    `${FeedbackApi.cycles}/${encodeURIComponent(cycleId)}`,
    {
      signal: options.signal,
    },
  );
}

/** Trigger one server-frozen manual cycle through real governed RBAC. */
export async function triggerFeedbackCycle(
  body: TriggerFeedbackCycleRequest,
  context: GovernedContext,
) {
  return governedPost<FeedbackCycleMutationView>(
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
    {
      params: query,
      signal: options.signal,
    },
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
