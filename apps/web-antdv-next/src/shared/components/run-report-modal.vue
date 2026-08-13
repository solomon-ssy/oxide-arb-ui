<script lang="ts" setup>
import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { InputNumber } from 'antdv-next';

import { $t } from '#/locales';

export interface RunReportParams {
  top_n?: number;
  knowledge_lag_secs?: number;
}

export interface RunReportPayload {
  /** Invoked with the collected optional overrides on confirm. */
  onSubmit: (params: RunReportParams) => void;
}

defineOptions({ name: 'RunReportModal' });

const topN = ref<null | number>(null);
const knowledgeLagSecs = ref<null | number>(null);
const payload = ref<null | RunReportPayload>(null);

const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  onConfirm() {
    payload.value?.onSubmit({
      ...(topN.value === null ? {} : { top_n: topN.value }),
      ...(knowledgeLagSecs.value === null
        ? {}
        : { knowledge_lag_secs: knowledgeLagSecs.value }),
    });
    modalApi.close();
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      payload.value = modalApi.getData<RunReportPayload>();
      topN.value = null;
      knowledgeLagSecs.value = null;
    }
  },
});
</script>

<template>
  <Modal :title="$t('page.quantReports.run.title')">
    <div class="flex flex-col gap-4" data-testid="run-report-form">
      <p class="text-muted-foreground text-sm">
        {{ $t('page.quantReports.run.summary') }}
      </p>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium" for="run-report-top-n">
          {{ $t('page.quantReports.run.topN') }}
        </label>
        <InputNumber
          id="run-report-top-n"
          v-model:value="topN"
          :min="1"
          :placeholder="$t('page.quantReports.run.serverDefault')"
          class="w-full"
          data-testid="run-report-top-n"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium" for="run-report-knowledge-lag">
          {{ $t('page.quantReports.run.knowledgeLagSecs') }}
        </label>
        <InputNumber
          id="run-report-knowledge-lag"
          v-model:value="knowledgeLagSecs"
          :min="0"
          :placeholder="$t('page.quantReports.run.serverDefault')"
          class="w-full"
          data-testid="run-report-knowledge-lag"
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
