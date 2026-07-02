<script lang="ts" setup>
import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { InputNumber } from 'antdv-next';

import { $t } from '#/locales';

export interface RunReportParams {
  top_n?: number;
  source_delay_secs?: number;
}

export interface RunReportPayload {
  /** Invoked with the collected optional overrides on confirm. */
  onSubmit: (params: RunReportParams) => void;
}

defineOptions({ name: 'RunReportModal' });

const topN = ref<null | number>(null);
const sourceDelaySecs = ref<null | number>(null);
const payload = ref<null | RunReportPayload>(null);

const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  onConfirm() {
    payload.value?.onSubmit({
      ...(topN.value === null ? {} : { top_n: topN.value }),
      ...(sourceDelaySecs.value === null
        ? {}
        : { source_delay_secs: sourceDelaySecs.value }),
    });
    modalApi.close();
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      payload.value = modalApi.getData<RunReportPayload>();
      topN.value = null;
      sourceDelaySecs.value = null;
    }
  },
});
</script>

<template>
  <Modal :title="$t('page.quantReports.run.title')">
    <div class="flex flex-col gap-4">
      <p class="text-muted-foreground text-sm">
        {{ $t('page.quantReports.run.summary') }}
      </p>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.quantReports.run.topN') }}
        </span>
        <InputNumber
          v-model:value="topN"
          :min="1"
          :placeholder="$t('page.quantReports.run.serverDefault')"
          class="w-full"
        />
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.quantReports.run.sourceDelaySecs') }}
        </span>
        <InputNumber
          v-model:value="sourceDelaySecs"
          :min="0"
          :placeholder="$t('page.quantReports.run.serverDefault')"
          class="w-full"
        />
      </div>
    </div>
  </Modal>
</template>

<style scoped>
:deep(.ant-input-number) {
  width: 100%;
}
</style>
