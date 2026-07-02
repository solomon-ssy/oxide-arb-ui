import type {
  Paginated,
  ReconciliationListQuery,
  ReconciliationView,
  ResolveReconciliationRequest,
  ResolveReconciliationResponse,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { governedPost } from '#/api/governed-request';
import { requestClient } from '#/api/request';

export namespace ReconciliationApi {
  export const base = '/quant/reconciliations';
  export const detail = (id: string) => `${base}/${id}`;
  export const resolve = (id: string) => `${base}/${id}/resolve`;
}

/** `GET /quant/reconciliations` — paginated reconciliation queue. */
export async function listReconciliations(query: ReconciliationListQuery = {}) {
  return requestClient.get<Paginated<ReconciliationView>>(
    ReconciliationApi.base,
    { params: query },
  );
}

/** `GET /quant/reconciliations/{id}` — a single reconciliation + evidence. */
export async function getReconciliation(id: string) {
  return requestClient.get<ReconciliationView>(ReconciliationApi.detail(id));
}

/** `POST /quant/reconciliations/{id}/resolve` — governed operator resolution. */
export async function resolveReconciliation(
  id: string,
  body: ResolveReconciliationRequest,
  ctx: GovernedContext,
) {
  return governedPost<ResolveReconciliationResponse>(
    ReconciliationApi.resolve(id),
    body,
    ctx,
  );
}
