<script lang="ts" setup>
import type { MarketStatus } from '@vben/types';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Select } from 'antdv-next';

import { $t } from '#/locales';

defineOptions({ name: 'UnblockMarketModal' });

/** Unblock may only restore to one of the operator-selectable live states. */
const RESTORE_STATUSES: MarketStatus[] = ['active', 'paused', 'filtered'];

export interface UnblockMarketPayload {
  onSubmit: (restoreStatus: MarketStatus) => void;
  question: string;
}

const restoreStatus = ref<MarketStatus>('active');
const payload = ref<null | UnblockMarketPayload>(null);

const restoreOptions = RESTORE_STATUSES.map((value) => ({
  label: $t(`enum.marketStatus.${value}`),
  value,
}));

const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  onConfirm() {
    payload.value?.onSubmit(restoreStatus.value);
    modalApi.close();
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      payload.value = modalApi.getData<UnblockMarketPayload>();
      restoreStatus.value = 'active';
    }
  },
});
</script>

<template>
  <Modal :title="$t('page.markets.actions.unblock')">
    <div class="flex flex-col gap-4">
      <p class="text-muted-foreground text-sm">
        {{ payload?.question }}
      </p>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.markets.unblock.restoreStatus') }}
        </span>
        <Select
          v-model:value="restoreStatus"
          :options="restoreOptions"
          class="w-full"
        />
      </div>
    </div>
  </Modal>
</template>
