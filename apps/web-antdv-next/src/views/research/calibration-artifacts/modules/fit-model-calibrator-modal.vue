<script lang="ts" setup>
import type { FitModelCalibratorRequest } from '@vben/types';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';
import {
  CALIBRATION_METHODS,
  DATASET_PURPOSES,
  TRAINING_DATASET_STATUSES,
} from '@vben/types';

import { message, Select } from 'antdv-next';

import { listModels, listTrainingDatasets } from '#/api/research';
import { $t } from '#/locales';

defineOptions({ name: 'FitModelCalibratorModal' });

export type FitModelCalibratorBody = Omit<FitModelCalibratorRequest, 'reason'>;

export interface FitModelCalibratorPayload {
  onSubmit: (body: FitModelCalibratorBody) => Promise<boolean>;
}

interface OptionItem {
  label: string;
  value: string;
}

const { handleRequest } = useRequestHandler();

const payload = ref<FitModelCalibratorPayload | null>(null);
const modelOptions = ref<OptionItem[]>([]);
const datasetOptions = ref<OptionItem[]>([]);
const loading = ref(false);

const modelVersionId = ref<string | undefined>();
const calibrationDatasetId = ref<string | undefined>();
const method = ref<FitModelCalibratorBody['method']>(
  CALIBRATION_METHODS.isotonic,
);

async function loadOptions() {
  loading.value = true;
  try {
    const [models, built, ready] = await Promise.all([
      handleRequest(() => listModels({ size: 200 }), { silent: true }),
      handleRequest(
        () =>
          listTrainingDatasets({
            purpose: DATASET_PURPOSES.calibration,
            size: 200,
            status: TRAINING_DATASET_STATUSES.built,
          }),
        { silent: true },
      ),
      handleRequest(
        () =>
          listTrainingDatasets({
            purpose: DATASET_PURPOSES.calibration,
            size: 200,
            status: TRAINING_DATASET_STATUSES.ready,
          }),
        { silent: true },
      ),
    ]);
    modelOptions.value = (models?.items ?? []).map((model) => ({
      label: `${model.model_version_id} · v${model.version} · ${model.publication_status}`,
      value: model.model_version_id,
    }));
    const seen = new Set<string>();
    const datasets: OptionItem[] = [];
    for (const dataset of [...(built?.items ?? []), ...(ready?.items ?? [])]) {
      if (seen.has(dataset.training_dataset_id)) {
        continue;
      }
      seen.add(dataset.training_dataset_id);
      datasets.push({
        label: `${dataset.training_dataset_id} · ${dataset.status} · ${dataset.sample_count}`,
        value: dataset.training_dataset_id,
      });
    }
    datasetOptions.value = datasets;
  } finally {
    loading.value = false;
  }
}

const methodOptions = [
  {
    label: $t('enum.calibrationMethod.isotonic'),
    value: CALIBRATION_METHODS.isotonic,
  },
  {
    label: $t('enum.calibrationMethod.platt'),
    value: CALIBRATION_METHODS.platt,
  },
];

const [Modal, modalApi] = useVbenModal({
  onConfirm: async () => {
    if (!payload.value) {
      return;
    }
    if (!modelVersionId.value || !calibrationDatasetId.value) {
      message.warning(
        $t('page.research.calibrationArtifacts.fitCalibrator.validation'),
      );
      return;
    }
    modalApi.setState({ confirmLoading: true });
    try {
      const ok = await payload.value.onSubmit({
        calibration_dataset_id: calibrationDatasetId.value,
        method: method.value,
        model_version_id: modelVersionId.value,
      });
      if (ok) {
        modalApi.close();
      }
    } finally {
      modalApi.setState({ confirmLoading: false });
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      payload.value = modalApi.getData<FitModelCalibratorPayload>();
      modelVersionId.value = undefined;
      calibrationDatasetId.value = undefined;
      method.value = CALIBRATION_METHODS.isotonic;
      void loadOptions();
    } else {
      payload.value = null;
    }
  },
});
</script>

<template>
  <Modal
    :title="$t('page.research.calibrationArtifacts.fitCalibrator.title')"
    class="w-full max-w-lg"
  >
    <div class="flex flex-col gap-4 py-2">
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.research.calibrationArtifacts.fitCalibrator.model') }}
        </span>
        <Select
          v-model:value="modelVersionId"
          :loading="loading"
          :options="modelOptions"
          :placeholder="
            $t(
              'page.research.calibrationArtifacts.fitCalibrator.modelPlaceholder',
            )
          "
          show-search
        />
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{
            $t(
              'page.research.calibrationArtifacts.fitCalibrator.calibrationDataset',
            )
          }}
        </span>
        <Select
          v-model:value="calibrationDatasetId"
          :loading="loading"
          :options="datasetOptions"
          :placeholder="
            $t(
              'page.research.calibrationArtifacts.fitCalibrator.datasetPlaceholder',
            )
          "
          show-search
        />
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.research.calibrationArtifacts.fitCalibrator.method') }}
        </span>
        <Select v-model:value="method" :options="methodOptions" />
      </div>
    </div>
  </Modal>
</template>
