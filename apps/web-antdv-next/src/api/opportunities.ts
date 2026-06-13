import type {
  OpportunityAuditView,
  OpportunityFunnelView,
  OpportunityListView,
  OpportunityWindowQuery,
  PageQuery,
  Paginated,
  UuidString,
} from '@vben/types';

import { requestClient } from '#/api/request';

export namespace OpportunityApi {
  export const base = '/opportunities';
  export const recent = `${base}/recent`;
  export const history = `${base}/history`;
  export const stats = `${base}/stats`;
  export const detail = (opportunityId: UuidString) =>
    `${base}/${opportunityId}`;
}

/** `GET /opportunities/recent` — detections in the last 24h (paginated). */
export async function fetchRecentOpportunities(query: PageQuery = {}) {
  return requestClient.get<Paginated<OpportunityListView>>(
    OpportunityApi.recent,
    { params: query },
  );
}

/** `GET /opportunities/history` — detections in a time window (max 90 days). */
export async function fetchOpportunityHistory(
  query: OpportunityWindowQuery = {},
) {
  return requestClient.get<Paginated<OpportunityListView>>(
    OpportunityApi.history,
    { params: query },
  );
}

/** `GET /opportunities/stats` — aggregated stage funnel for a time window. */
export async function fetchOpportunityStats(
  query: Omit<OpportunityWindowQuery, keyof PageQuery> = {},
) {
  return requestClient.get<OpportunityFunnelView>(OpportunityApi.stats, {
    params: query,
  });
}

/** `GET /opportunities/{opportunity_id}` — full audit-trail timeline. */
export async function getOpportunityAudit(opportunityId: UuidString) {
  return requestClient.get<OpportunityAuditView[]>(
    OpportunityApi.detail(opportunityId),
  );
}
