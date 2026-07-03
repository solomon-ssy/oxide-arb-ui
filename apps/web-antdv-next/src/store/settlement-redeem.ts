import type { SettlementRedeemLifecycleEvent } from '@vben/types';

import { ref } from 'vue';

import { defineStore } from 'pinia';

/**
 * Cross-page settlement-redeem revision coordinator. WS `quant.settlement`
 * frames only bump a revision counter + record the last event; the settlement
 * ledger re-fetches by REST on any bump (WS never carries the ledger rows).
 */
export const useSettlementRedeemStore = defineStore(
  'qp-settlement-redeem',
  () => {
    const revision = ref(0);
    const lastEvent = ref<null | SettlementRedeemLifecycleEvent>(null);

    function bumpRevision(event: SettlementRedeemLifecycleEvent) {
      lastEvent.value = event;
      revision.value += 1;
    }

    function $reset() {
      revision.value = 0;
      lastEvent.value = null;
    }

    return { $reset, bumpRevision, lastEvent, revision };
  },
);
