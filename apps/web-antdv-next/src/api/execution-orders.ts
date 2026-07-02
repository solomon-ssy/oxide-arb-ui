import type {
  ExecutionOrderListQuery,
  ExecutionOrderView,
  Paginated,
} from '@vben/types';

import { requestClient } from '#/api/request';

export namespace ExecutionOrderApi {
  export const base = '/quant/execution-orders';
  export const detail = (id: string) => `${base}/${id}`;
}

/** `GET /quant/execution-orders` — paginated CLOB submission ledger. */
export async function listExecutionOrders(query: ExecutionOrderListQuery = {}) {
  return requestClient.get<Paginated<ExecutionOrderView>>(
    ExecutionOrderApi.base,
    { params: query },
  );
}

/** `GET /quant/execution-orders/{id}` — a single execution order. */
export async function getExecutionOrder(id: string) {
  return requestClient.get<ExecutionOrderView>(ExecutionOrderApi.detail(id));
}
