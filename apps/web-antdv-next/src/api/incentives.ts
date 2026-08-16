import type {
  Paginated,
  VenueIncentiveEventQuery,
  VenueIncentiveEventView,
} from '@vben/types';

import {
  decodeIncentiveEvent,
  decodeIncentiveReconciliation,
  decodeMany,
} from '#/api/quant-operator-contract';
import { requestClient } from '#/api/request';

export namespace IncentiveApi {
  export const reconciliation = '/quant/incentives/reconciliation';
  export const events = '/quant/incentives/events';
}

/** Account-level estimate → award → wallet reconciliation and scan health. */
export async function getIncentiveReconciliation() {
  const response = await requestClient.get<unknown>(
    IncentiveApi.reconciliation,
  );
  return decodeIncentiveReconciliation(response);
}

/** Immutable incentive events, including zero-amount award retractions. */
export async function listIncentiveEvents(
  query: VenueIncentiveEventQuery = {},
) {
  const response = await requestClient.get<Paginated<unknown>>(
    IncentiveApi.events,
    { params: query },
  );
  return {
    ...response,
    items: decodeMany(response.items, decodeIncentiveEvent),
  } satisfies Paginated<VenueIncentiveEventView>;
}
