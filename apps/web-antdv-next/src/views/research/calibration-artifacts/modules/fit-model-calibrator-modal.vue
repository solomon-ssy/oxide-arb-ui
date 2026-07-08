<script lang="ts" setup>
import type {
  FitModelCalibratorRequest,
  ModelCalibrationFitPreflightView,
} from '@vben/types';

import { ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';
import {
  CALIBRATION_METHODS,
  DATASET_PURPOSES,
  TRAINING_DATASET_STATUSES,
} from '@vben/types';

import { useDebounceFn } from '@vueuse/core';
import { Alert, message, Select, Spin } from 'antdv-next';

import { fetchCalibrationFitPreflight } from '#/api/calibration';
import { listModels, listTrainingDatasets } from '#/api/research';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';

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

const preflight = ref<ModelCalibrationFitPreflightView | null>(null);
const preflightLoading = ref(false);
const preflightError = ref<null | string>(null);

const runPreflight = useDebounceFn(async () => {
  const model = modelVersionId.value;
  const dataset = calibrationDatasetId.value;
  if (!model || !dataset) {
    preflight.value = null;
    preflightError.value = null;
    return;
  }
  preflightLoading.value = true;
  preflightError.value = null;
  try {
    preflight.value = await fetchCalibrationFitPreflight(model, dataset);
  } catch {
    // Preflight is advisory only — the authoritative check still runs
    // server-side at fit time, so a transient preflight failure must never
    // block the operator from submitting.
    preflight.value = null;
    preflightError.value = $t(
      'page.research.calibrationArtifacts.fitCalibrator.preflight.checkFailed',
    );
  } finally {
    preflightLoading.value = false;
  }
}, 400);

watch([modelVersionId, calibrationDatasetId], () => {
  preflight.value = null;
  preflightError.value = null;
  void runPreflight();
});

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
      preflight.value = null;
      preflightError.value = null;
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

      <Spin v-if="preflightLoading" size="small" />
      <Alert
        v-else-if="preflightError"
        :message="preflightError"
        show-icon
        type="warning"
      />
      <template v-else-if="preflight">
        <Alert
          :message="
            $t(
              preflight.disjoint_ok
                ? 'page.research.calibrationArtifacts.fitCalibrator.preflight.disjointOk'
                : 'page.research.calibrationArtifacts.fitCalibrator.preflight.disjointFail',
            )
          "
          :type="preflight.disjoint_ok ? 'success' : 'error'"
          show-icon
        />
        <Alert
          :message="
            $t(
              preflight.embargo_ok
                ? 'page.research.calibrationArtifacts.fitCalibrator.preflight.embargoOk'
                : 'page.research.calibrationArtifacts.fitCalibrator.preflight.embargoFail',
            )
          "
          :description="
            preflight.required_start
              ? $t(
                  'page.research.calibrationArtifacts.fitCalibrator.preflight.requiredStart',
                  { time: formatDateTimeLocal(preflight.required_start) },
                )
              : undefined
          "
          :type="preflight.embargo_ok ? 'success' : 'error'"
          show-icon
        />
        <ul
          v-if="preflight.messages.length > 0"
          class="text-destructive list-disc pl-4 text-xs"
        >
          <li v-for="(msg, index) in preflight.messages" :key="index">
            {{ msg }}
          </li>
        </ul>
        <p class="text-muted-foreground text-xs">
          {{
            $t(
              'page.research.calibrationArtifacts.fitCalibrator.preflight.window',
              {
                calStart: formatDateTimeLocal(
                  preflight.calibration_window_start,
                ),
                calEnd: formatDateTimeLocal(preflight.calibration_window_end),
                trainEnd: preflight.training_window_end
                  ? formatDateTimeLocal(preflight.training_window_end)
                  : '—',
              },
            )
          }}
        </p>
      </template>
    </div>
  </Modal>
</template>
