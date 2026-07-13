import type {
  ApproveOrderIntentRequest,
  CreateOrderIntentRequest,
  IntentActionRequest,
  OrderIntentListQuery,
  OrderIntentView,
  Paginated,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { governedPost } from '#/api/governed-request';
import { requestClient } from '#/api/request';

export namespace OrderIntentApi {
  export const base = '/quant/intents';
  export const detail = (id: string) => `${base}/${id}`;
  export const approve = (id: string) => `${base}/${id}/approve`;
  export const reject = (id: string) => `${base}/${id}/reject`;
  export const cancel = (id: string) => `${base}/${id}/cancel`;
}

/** `GET /quant/intents` — paginated, filtered intent list. */
export async function listOrderIntents(query: OrderIntentListQuery = {}) {
  return requestClient.get<Paginated<OrderIntentView>>(OrderIntentApi.base, {
    params: query,
  });
}

/** `GET /quant/intents/{id}` — a single order intent. */
export async function getOrderIntent(id: string) {
  return requestClient.get<OrderIntentView>(OrderIntentApi.detail(id));
}

/** `POST /quant/intents` — governed intent creation from a recommendation. */
export async function createOrderIntent(
  body: CreateOrderIntentRequest,
  ctx: GovernedContext,
) {
  return governedPost<OrderIntentView>(OrderIntentApi.base, body, ctx);
}

/** `POST /quant/intents/{id}/approve` — governed approval (optional overrides). */
export async function approveOrderIntent(
  id: string,
  body: ApproveOrderIntentRequest,
  ctx: GovernedContext,
) {
  return governedPost<OrderIntentView>(OrderIntentApi.approve(id), body, ctx);
}

/** `POST /quant/intents/{id}/reject` — governed rejection. */
export async function rejectOrderIntent(
  id: string,
  body: IntentActionRequest,
  ctx: GovernedContext,
) {
  return governedPost<OrderIntentView>(OrderIntentApi.reject(id), body, ctx);
}

/** `POST /quant/intents/{id}/cancel` — governed cancellation. */
export async function cancelOrderIntent(
  id: string,
  body: IntentActionRequest,
  ctx: GovernedContext,
) {
  return governedPost<OrderIntentView>(OrderIntentApi.cancel(id), body, ctx);
}
