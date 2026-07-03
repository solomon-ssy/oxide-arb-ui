<script lang="ts" setup>
import type { RunBacktestRequest } from '@vben/types';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { message, Select, Switch } from 'antdv-next';

import { listModels } from '#/api/research';
import { fetchRuntimeConfigVersions } from '#/api/runtime-config';
import { $t } from '#/locales';

import { useTrainableDatasetOptions } from '../../shared/use-trainable-dataset-options';

defineOptions({ name: 'ModelBacktestModal' });

/** Domain body collected by the form (governed `reason` is added by the caller). */
export type BacktestBody = Omit<RunBacktestRequest, 'reason'>;

export interface ModelBacktestPayload {
  /** Model version the backtest replays (path id). */
  modelVersionId: string;
  /** The model's own training dataset, prefilled as the default replay set. */
  trainingDatasetId?: string;
  onSubmit: (body: BacktestBody) => void;
}

interface OptionItem {
  label: string;
  value: string;
}

const { handleRequest } = useRequestHandler();

const payload = ref<ModelBacktestPayload | null>(null);
const versionOptions = ref<OptionItem[]>([]);
const comparisonOptions = ref<OptionItem[]>([]);
const comparisonLoading = ref(false);

const trainingDatasetId = ref<string | undefined>();
const runtimeConfigVersionId = ref<string | undefined>();
const calibrate = ref<boolean>(false);
const comparisonModelVersionId = ref<string | undefined>();

const prefillDatasetId = ref<string | undefined>();
const {
  datasetOptions,
  loading: datasetLoading,
  reload: reloadDatasets,
} = useTrainableDatasetOptions({
  prefillId: prefillDatasetId,
});

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

async function loadComparisonModels() {
  const currentId = payload.value?.modelVersionId;
  comparisonLoading.value = true;
  try {
    const page = await handleRequest(() => listModels({ size: 200 }), {
      silent: true,
    });
    comparisonOptions.value = (page?.items ?? [])
      .filter((model) => model.model_version_id !== currentId)
      .map((model) => ({
        label: `${model.model_version_id} · v${model.version} · ${model.publication_status}`,
        value: model.model_version_id,
      }));
  } finally {
    comparisonLoading.value = false;
  }
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
      comparison_model_version_id: comparisonModelVersionId.value || undefined,
      runtime_config_version_id: runtimeConfigVersionId.value,
      training_dataset_id: trainingDatasetId.value,
    });
    modalApi.close();
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      payload.value = modalApi.getData<ModelBacktestPayload>();
      trainingDatasetId.value = payload.value?.trainingDatasetId || undefined;
      prefillDatasetId.value = payload.value?.trainingDatasetId || undefined;
      runtimeConfigVersionId.value = undefined;
      calibrate.value = false;
      comparisonModelVersionId.value = undefined;
      void loadOptions();
      void reloadDatasets();
      void loadComparisonModels();
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
        <Select
          v-model:value="trainingDatasetId"
          :loading="datasetLoading"
          :options="datasetOptions"
          :placeholder="$t('page.research.datasets.selector.placeholder')"
          show-search
          option-filter-prop="label"
        />
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
        <Select
          v-model:value="comparisonModelVersionId"
          allow-clear
          :loading="comparisonLoading"
          :options="comparisonOptions"
          :placeholder="
            $t('page.research.models.backtest.comparisonPlaceholder')
          "
          show-search
          option-filter-prop="label"
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
