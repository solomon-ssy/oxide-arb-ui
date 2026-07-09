<script lang="ts" setup>
import type {
  FitModelCalibratorRequest,
  ModelCalibrationFitPreflightView,
} from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';
import {
  CALIBRATION_METHODS,
  DATASET_PURPOSES,
  TRAINING_DATASET_STATUSES,
} from '@vben/types';

import { useDebounceFn } from '@vueuse/core';
import { Alert, Spin } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { fetchCalibrationFitPreflight } from '#/api/calibration';
import { listModels, listTrainingDatasets } from '#/api/research';
import { $t } from '#/locales';
import BulletList from '#/shared/components/bullet-list.vue';
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

const preflight = ref<ModelCalibrationFitPreflightView | null>(null);
const preflightLoading = ref(false);
const preflightError = ref<null | string>(null);

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

const runPreflight = useDebounceFn(async () => {
  const values = await formApi.getValues();
  const model = values.model_version_id as string | undefined;
  const dataset = values.calibration_dataset_id as string | undefined;
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
    preflight.value = null;
    preflightError.value = $t(
      'page.research.calibrationArtifacts.fitCalibrator.preflight.checkFailed',
    );
  } finally {
    preflightLoading.value = false;
  }
}, 400);

async function loadOptions() {
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
  const modelOptions: OptionItem[] = (models?.items ?? []).map((model) => ({
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
  formApi.updateSchema([
    {
      componentProps: {
        loading: false,
        options: modelOptions,
        showSearch: true,
      },
      fieldName: 'model_version_id',
    },
    {
      componentProps: {
        loading: false,
        options: datasets,
        showSearch: true,
      },
      fieldName: 'calibration_dataset_id',
    },
  ]);
}

const preflightOk = computed(
  () =>
    preflight.value !== null &&
    preflight.value.disjoint_ok &&
    preflight.value.embargo_ok,
);

async function onSubmit(values: Record<string, unknown>) {
  if (!payload.value) {
    return;
  }
  modalApi.setState({ confirmLoading: true });
  try {
    const ok = await payload.value.onSubmit({
      calibration_dataset_id: values.calibration_dataset_id as string,
      method: values.method as FitModelCalibratorBody['method'],
      model_version_id: values.model_version_id as string,
    });
    if (ok) {
      modalApi.close();
    }
  } finally {
    modalApi.setState({ confirmLoading: false });
  }
}

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  handleSubmit: onSubmit,
  schema: [
    {
      component: 'Select',
      componentProps: {
        loading: false,
        options: [],
        placeholder: $t(
          'page.research.calibrationArtifacts.fitCalibrator.modelPlaceholder',
        ),
        showSearch: true,
      },
      fieldName: 'model_version_id',
      label: $t('page.research.calibrationArtifacts.fitCalibrator.model'),
      rules: 'selectRequired',
    },
    {
      component: 'Select',
      componentProps: {
        loading: false,
        options: [],
        placeholder: $t(
          'page.research.calibrationArtifacts.fitCalibrator.datasetPlaceholder',
        ),
        showSearch: true,
      },
      dependencies: {
        trigger() {
          preflight.value = null;
          preflightError.value = null;
          void runPreflight();
        },
        triggerFields: ['model_version_id', 'calibration_dataset_id'],
      },
      fieldName: 'calibration_dataset_id',
      label: $t(
        'page.research.calibrationArtifacts.fitCalibrator.calibrationDataset',
      ),
      rules: 'selectRequired',
    },
    {
      component: 'Select',
      componentProps: { options: methodOptions },
      defaultValue: CALIBRATION_METHODS.isotonic,
      fieldName: 'method',
      label: $t('page.research.calibrationArtifacts.fitCalibrator.method'),
      rules: 'selectRequired',
    },
  ],
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  onConfirm: () => {
    if (!preflightOk.value && preflight.value !== null) {
      return;
    }
    void formApi.validateAndSubmitForm();
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      payload.value = modalApi.getData<FitModelCalibratorPayload>();
      preflight.value = null;
      preflightError.value = null;
      formApi.resetForm();
      formApi.setValues({ method: CALIBRATION_METHODS.isotonic });
      formApi.updateSchema([
        {
          componentProps: { loading: true, options: [] },
          fieldName: 'model_version_id',
        },
        {
          componentProps: { loading: true, options: [] },
          fieldName: 'calibration_dataset_id',
        },
      ]);
      void loadOptions();
    } else {
      payload.value = null;
    }
  },
});
</script>

<template>
  <Modal
    :confirm-button-props="{ disabled: preflight !== null && !preflightOk }"
    :title="$t('page.research.calibrationArtifacts.fitCalibrator.title')"
    class="w-full max-w-lg"
  >
    <Form />
    <div class="mt-4 flex flex-col gap-4">
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
        <BulletList
          v-if="preflight.messages.length > 0"
          tone="destructive"
          :items="preflight.messages"
        />
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
