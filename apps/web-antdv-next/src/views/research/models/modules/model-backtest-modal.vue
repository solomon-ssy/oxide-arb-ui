<script lang="ts" setup>
import type { RunBacktestRequest } from '@vben/types';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Input, message, Select, Switch } from 'antdv-next';

import { fetchRuntimeConfigVersions } from '#/api/runtime-config';
import { $t } from '#/locales';

defineOptions({ name: 'ModelBacktestModal' });

/** Domain body collected by the form (governed `reason` is added by the caller). */
export type BacktestBody = Omit<RunBacktestRequest, 'reason'>;

export interface ModelBacktestPayload {
  /** Model version the backtest replays (path id). */
  modelVersionId: string;
  onSubmit: (body: BacktestBody) => void;
}

interface OptionItem {
  label: string;
  value: string;
}

const { handleRequest } = useRequestHandler();

const payload = ref<ModelBacktestPayload | null>(null);
const versionOptions = ref<OptionItem[]>([]);

const trainingDatasetId = ref<string>('');
const runtimeConfigVersionId = ref<string | undefined>();
const calibrate = ref<boolean>(false);
const comparisonModelVersionId = ref<string>('');

async function loadOptions() {
  const versions = await handleRequest(
    () => fetchRuntimeConfigVersions({ limit: 200 }),
    { silent: true },
  );
  versionOptions.value = (versions ?? []).map((version) => ({
    label: version.runtime_config_version_id,
    value: version.runtime_config_version_id,
  }));
}

const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  onConfirm() {
    if (!trainingDatasetId.value || !runtimeConfigVersionId.value) {
      message.warning($t('page.research.models.backtest.incomplete'));
      return;
    }
    payload.value?.onSubmit({
      calibrate: calibrate.value,
      comparison_model_version_id:
        comparisonModelVersionId.value.trim() || undefined,
      runtime_config_version_id: runtimeConfigVersionId.value,
      training_dataset_id: trainingDatasetId.value,
    });
    modalApi.close();
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      payload.value = modalApi.getData<ModelBacktestPayload>();
      trainingDatasetId.value = '';
      runtimeConfigVersionId.value = undefined;
      calibrate.value = false;
      comparisonModelVersionId.value = '';
      void loadOptions();
    }
  },
});
</script>

<template>
  <Modal :title="$t('page.research.models.backtest.title')">
    <div class="flex flex-col gap-4">
      <p class="text-muted-foreground text-sm">
        {{ $t('page.research.models.backtest.summary') }}
      </p>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.research.models.backtest.trainingDataset') }}
        </span>
        <Input v-model:value="trainingDatasetId" />
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.research.models.backtest.runtimeConfigVersion') }}
        </span>
        <Select
          v-model:value="runtimeConfigVersionId"
          :options="versionOptions"
          show-search
          option-filter-prop="label"
        />
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.research.models.backtest.comparisonModel') }}
        </span>
        <Input
          v-model:value="comparisonModelVersionId"
          :placeholder="
            $t('page.research.models.backtest.comparisonPlaceholder')
          "
        />
      </div>
      <div class="flex items-center gap-2">
        <Switch v-model:checked="calibrate" />
        <span class="text-sm">
          {{ $t('page.research.models.backtest.calibrate') }}
        </span>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
:deep(.ant-select) {
  width: 100%;
}
</style>
