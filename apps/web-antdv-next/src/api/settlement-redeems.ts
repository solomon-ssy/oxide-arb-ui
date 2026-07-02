import type {
  Paginated,
  SettlementRedeemDetailView,
  SettlementRedeemListQuery,
  SettlementRedeemView,
} from '@vben/types';

import { requestClient } from '#/api/request';

export namespace SettlementRedeemApi {
  export const base = '/quant/settlement-redeems';
  export const detail = (id: string) => `${base}/${id}`;
}

/** `GET /quant/settlement-redeems` — paginated redeem batch ledger. */
export async function listSettlementRedeems(
  query: SettlementRedeemListQuery = {},
) {
  return requestClient.get<Paginated<SettlementRedeemView>>(
    SettlementRedeemApi.base,
    { params: query },
  );
}

/** `GET /quant/settlement-redeems/{id}` — a batch header + redeemed lots. */
export async function getSettlementRedeem(id: string) {
  return requestClient.get<SettlementRedeemDetailView>(
    SettlementRedeemApi.detail(id),
  );
}
