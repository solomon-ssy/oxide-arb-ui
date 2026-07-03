import type { Ref } from 'vue';

import { watch } from 'vue';

import { useOrderIntentStore } from '#/store';

/**
 * Refetch an open ledger drawer when `quant.intent` WS bumps the store
 * revision — mirrors {@link IntentDetailDrawer} so list + drawer converge.
 */
export function useDrawerIntentRevisionRefresh(
  openId: Ref<null | string>,
  refresh: (id: string) => Promise<void> | void,
): void {
  const orderIntentStore = useOrderIntentStore();

  watch(
    () => orderIntentStore.revision,
    () => {
      const id = openId.value;
      if (id) {
        void refresh(id);
      }
    },
  );
}
