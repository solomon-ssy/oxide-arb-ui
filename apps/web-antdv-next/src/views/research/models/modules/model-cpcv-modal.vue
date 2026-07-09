<script lang="ts" setup>
import type { RunCpcvBacktestRequest } from '@vben/types';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Alert } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { getModelSpec, getTrainingDataset } from '#/api/research';
import { fetchRuntimeConfigVersions } from '#/api/runtime-config';
import { $t } from '#/locales';

import { useTrainableDatasetOptions } from '../../shared/use-trainable-dataset-options';

defineOptions({ name: 'ModelCpcvModal' });

/** Domain body collected by the form (governed `reason` is added by the caller). */
export type CpcvBody = Omit<RunCpcvBacktestRequest, 'reason'>;

export interface ModelCpcvPayload {
  modelVersionId: string;
  modelSpecId: string;
  trainingDatasetId?: string;
  onSubmit: (body: CpcvBody) => Promise<boolean>;
}

interface OptionItem {
  label: string;
  value: string;
}

const { handleRequest } = useRequestHandler();

const payload = ref<ModelCpcvPayload | null>(null);
const prefillDatasetId = ref<string | undefined>();
const {
  datasetOptions,
  loading: datasetLoading,
  reload: reloadDatasets,
} = useTrainableDatasetOptions({ prefillId: prefillDatasetId });

async function loadOptions() {
  const versions = await handleRequest(
    () => fetchRuntimeConfigVersions({ limit: 200 }),
    { silent: true },
  );
  const versionOptions: OptionItem[] = (versions ?? []).map((version) => ({
    label: version.runtime_config_version_id,
    value: version.runtime_config_version_id,
  }));
  formApi.updateSchema([
    {
      componentProps: { optionFilterProp: 'label', options: versionOptions },
      fieldName: 'runtime_config_version_id',
    },
  ]);
}

async function prefillFromSpecAndDataset() {
  const currentPayload = payload.value;
  if (!currentPayload) {
    return;
  }
  const trainingDatasetId = currentPayload.trainingDatasetId;
  const [spec, dataset] = await Promise.all([
    handleRequest(() => getModelSpec(currentPayload.modelSpecId), {
      silent: true,
    }),
    trainingDatasetId
      ? handleRequest(() => getTrainingDataset(trainingDatasetId), {
          silent: true,
        })
      : Promise.resolve(null),
  ]);
  const values: Record<string, unknown> = {
    training_dataset_id: trainingDatasetId || undefined,
  };
  if (spec) {
    values.model_family = spec.model_family;
    values.prediction_horizon_secs = spec.prediction_horizon_secs;
  }
  if (dataset?.horizons_secs?.length) {
    values.label_horizon_secs = dataset.horizons_secs[0];
  }
  formApi.setValues(values);
}

function syncDatasetSchema() {
  formApi.updateSchema([
    {
      componentProps: {
        loading: datasetLoading.value,
        optionFilterProp: 'label',
        options: datasetOptions.value,
        placeholder: $t('page.research.datasets.selector.placeholder'),
      },
      fieldName: 'training_dataset_id',
    },
  ]);
}

async function onSubmit(values: Record<string, unknown>) {
  if (!payload.value) {
    return;
  }
  modalApi.lock();
  try {
    const ok = await payload.value.onSubmit({
      label_horizon_secs: Number(values.label_horizon_secs ?? 0),
      label_name: values.label_name as string,
      model_family: values.model_family as string,
      prediction_horizon_secs: Number(values.prediction_horizon_secs ?? 86_400),
      runtime_config_version_id: values.runtime_config_version_id as string,
      training_dataset_id: values.training_dataset_id as string,
    });
    if (ok) {
      modalApi.close();
    }
  } finally {
    modalApi.unlock();
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
        optionFilterProp: 'label',
        options: [],
        placeholder: $t('page.research.datasets.selector.placeholder'),
        showSearch: true,
      },
      fieldName: 'training_dataset_id',
      label: $t('page.research.models.cpcv.trainingDataset'),
      rules: 'selectRequired',
    },
    {
      component: 'Select',
      componentProps: {
        optionFilterProp: 'label',
        options: [],
        showSearch: true,
      },
      fieldName: 'runtime_config_version_id',
      label: $t('page.research.models.cpcv.runtimeConfigVersion'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      fieldName: 'model_family',
      label: $t('page.research.models.cpcv.modelFamily'),
      rules: 'required',
    },
    {
      component: 'Input',
      defaultValue: 'settlement_outcome',
      fieldName: 'label_name',
      label: $t('page.research.models.cpcv.labelName'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { min: 0 },
      defaultValue: 0,
      fieldName: 'label_horizon_secs',
      label: $t('page.research.models.cpcv.labelHorizonSecs'),
    },
    {
      component: 'InputNumber',
      componentProps: { min: 1 },
      defaultValue: 86_400,
      fieldName: 'prediction_horizon_secs',
      label: $t('page.research.models.cpcv.predictionHorizonSecs'),
      rules: 'required',
    },
  ],
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  onConfirm: () => formApi.validateAndSubmitForm(),
  onOpenChange(isOpen) {
    if (isOpen) {
      payload.value = modalApi.getData<ModelCpcvPayload>();
      prefillDatasetId.value = payload.value?.trainingDatasetId || undefined;
      formApi.resetForm();
      formApi.setValues({
        label_horizon_secs: 0,
        label_name: 'settlement_outcome',
        prediction_horizon_secs: 86_400,
        training_dataset_id: payload.value?.trainingDatasetId || undefined,
      });
      formApi.updateSchema([
        { componentProps: { loading: true }, fieldName: 'training_dataset_id' },
      ]);
      void reloadDatasets().then(syncDatasetSchema);
      void loadOptions();
      void prefillFromSpecAndDataset();
    }
  },
});
</script>

<template>
  <Modal :title="$t('page.research.models.cpcv.title')">
    <Alert
      class="mb-4"
      :message="$t('page.research.models.cpcv.dualTrackHint')"
      show-icon
      type="info"
    />
    <p class="text-muted-foreground mb-4 text-sm">
      {{ $t('page.research.models.cpcv.summary') }}
    </p>
    <Form />
  </Modal>
</template>
