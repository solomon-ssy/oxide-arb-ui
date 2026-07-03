<script lang="ts" setup>
import type { TrainModelRequest } from '@vben/types';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Input, InputNumber, message, Select } from 'antdv-next';

import { listModelSpecs } from '#/api/research';
import { fetchRuntimeConfigVersions } from '#/api/runtime-config';
import { $t } from '#/locales';

defineOptions({ name: 'ModelTrainModal' });

/** Domain body collected by the form (governed `reason` is added by the caller). */
export type TrainModelBody = Omit<TrainModelRequest, 'reason'>;

export interface ModelTrainPayload {
  /** Preselected dataset id (from a dataset-row "Train" handoff), if any. */
  trainingDatasetId?: string;
  onSubmit: (body: TrainModelBody) => void;
}

interface OptionItem {
  label: string;
  value: string;
}

const { handleRequest } = useRequestHandler();

const payload = ref<ModelTrainPayload | null>(null);
const specOptions = ref<OptionItem[]>([]);
const versionOptions = ref<OptionItem[]>([]);

const modelSpecId = ref<string | undefined>();
const trainingDatasetId = ref<string>('');
const runtimeConfigVersionId = ref<string | undefined>();
const modelFamily = ref<string>('weighted_factor');
const labelName = ref<string>('');
const labelHorizonSecs = ref<number>(0);
const validationFolds = ref<number>(3);

async function loadOptions() {
  const [specs, versions] = await Promise.all([
    handleRequest(() => listModelSpecs({ size: 200 }), { silent: true }),
    handleRequest(() => fetchRuntimeConfigVersions({ limit: 200 }), {
      silent: true,
    }),
  ]);
  specOptions.value = (specs?.items ?? []).map((spec) => ({
    label: `${spec.name} · ${spec.model_spec_id}`,
    value: spec.model_spec_id,
  }));
  versionOptions.value = (versions ?? []).map((version) => ({
    label: version.runtime_config_version_id,
    value: version.runtime_config_version_id,
  }));
}

const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  onConfirm() {
    if (
      !modelSpecId.value ||
      !trainingDatasetId.value ||
      !runtimeConfigVersionId.value ||
      !modelFamily.value ||
      !labelName.value
    ) {
      message.warning($t('page.research.models.train.incomplete'));
      return;
    }
    payload.value?.onSubmit({
      label_horizon_secs: labelHorizonSecs.value,
      label_name: labelName.value,
      model_family: modelFamily.value,
      model_spec_id: modelSpecId.value,
      runtime_config_version_id: runtimeConfigVersionId.value,
      training_dataset_id: trainingDatasetId.value,
      validation_folds: validationFolds.value,
    });
    modalApi.close();
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      payload.value = modalApi.getData<ModelTrainPayload>();
      trainingDatasetId.value = payload.value?.trainingDatasetId ?? '';
      void loadOptions();
    }
  },
});
</script>

<template>
  <Modal :title="$t('page.research.models.train.title')">
    <div class="flex flex-col gap-4">
      <p class="text-muted-foreground text-sm">
        {{ $t('page.research.models.train.summary') }}
      </p>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.research.models.train.modelSpec') }}
        </span>
        <Select
          v-model:value="modelSpecId"
          :options="specOptions"
          show-search
          option-filter-prop="label"
        />
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.research.models.train.trainingDataset') }}
        </span>
        <Input v-model:value="trainingDatasetId" />
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.research.models.train.runtimeConfigVersion') }}
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
          {{ $t('page.research.models.train.modelFamily') }}
        </span>
        <Input
          v-model:value="modelFamily"
          :placeholder="$t('page.research.models.train.modelFamilyPlaceholder')"
        />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <span class="text-sm font-medium">
            {{ $t('page.research.models.train.labelName') }}
          </span>
          <Input v-model:value="labelName" />
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-sm font-medium">
            {{ $t('page.research.models.train.labelHorizonSecs') }}
          </span>
          <InputNumber
            v-model:value="labelHorizonSecs"
            :min="0"
            class="w-full"
          />
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.research.models.train.validationFolds') }}
        </span>
        <InputNumber
          v-model:value="validationFolds"
          :max="20"
          :min="2"
          class="w-full"
        />
      </div>
    </div>
  </Modal>
</template>

<style scoped>
:deep(.ant-input-number),
:deep(.ant-select) {
  width: 100%;
}
</style>
