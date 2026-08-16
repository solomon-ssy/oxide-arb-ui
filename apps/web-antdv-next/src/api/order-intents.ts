import type {
  ApproveOrderIntentRequest,
  CreateIntentRequest,
  IntentActionRequest,
  OrderIntentListQuery,
  Paginated,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { governedPost } from '#/api/governed-request';
import {
  decodeCreateIntentRequest,
  decodeExecutionConfirmation,
  decodeMany,
} from '#/api/quant-operator-contract';
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
  const response = await requestClient.get<Paginated<unknown>>(
    OrderIntentApi.base,
    {
      params: query,
    },
  );
  return {
    ...response,
    items: decodeMany(response.items, decodeExecutionConfirmation),
  };
}

/** `GET /quant/intents/{id}` — a single order intent. */
export async function getOrderIntent(id: string) {
  const response = await requestClient.get<unknown>(OrderIntentApi.detail(id));
  return decodeExecutionConfirmation(response);
}

/** `POST /quant/intents` — governed intent creation from a recommendation. */
export async function createOrderIntent(
  body: CreateIntentRequest,
  ctx: GovernedContext,
) {
  const request = decodeCreateIntentRequest(body);
  const response = await governedPost<unknown>(
    OrderIntentApi.base,
    request,
    ctx,
  );
  return decodeExecutionConfirmation(response);
}

/** `POST /quant/intents/{id}/approve` — governed approval (optional overrides). */
export async function approveOrderIntent(
  id: string,
  body: ApproveOrderIntentRequest,
  ctx: GovernedContext,
) {
  const response = await governedPost<unknown>(
    OrderIntentApi.approve(id),
    body,
    ctx,
  );
  return decodeExecutionConfirmation(response);
}

/** `POST /quant/intents/{id}/reject` — governed rejection. */
export async function rejectOrderIntent(
  id: string,
  body: IntentActionRequest,
  ctx: GovernedContext,
) {
  const response = await governedPost<unknown>(
    OrderIntentApi.reject(id),
    body,
    ctx,
  );
  return decodeExecutionConfirmation(response);
}

/** `POST /quant/intents/{id}/cancel` — governed cancellation. */
export async function cancelOrderIntent(
  id: string,
  body: IntentActionRequest,
  ctx: GovernedContext,
) {
  const response = await governedPost<unknown>(
    OrderIntentApi.cancel(id),
    body,
    ctx,
  );
  return decodeExecutionConfirmation(response);
}
