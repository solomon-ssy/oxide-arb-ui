import type { Ref } from 'vue';

import { watch } from 'vue';

import { useSettlementRedeemStore } from '#/store';

/**
 * Refetch an open settlement-redeem drawer when `quant.settlement` WS bumps
 * the store revision — mirrors {@link useDrawerIntentRevisionRefresh} so the
 * list and drawer converge on worker state transitions (submitted → confirmed/failed).
 */
export function useDrawerSettlementRevisionRefresh(
  openId: Ref<null | string>,
  refresh: (id: string) => Promise<void> | void,
): void {
  const settlementStore = useSettlementRedeemStore();

  watch(
    () => settlementStore.revision,
    () => {
      const id = openId.value;
      if (id) {
        void refresh(id);
      }
    },
  );
}
