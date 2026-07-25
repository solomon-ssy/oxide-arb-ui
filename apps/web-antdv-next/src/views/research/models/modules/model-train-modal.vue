<script lang="ts" setup>
import type { TrainModelRequest } from '@vben/types';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { DATASET_PURPOSES } from '@vben/types';

import { Alert } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { useDatasetOptions } from '../../shared/use-dataset-options';

defineOptions({ name: 'ModelTrainModal' });

/** The governed reason is collected by the shared action dialog. */
export type TrainModelBody = Omit<TrainModelRequest, 'reason'>;

export interface ModelTrainPayload {
  trainingDatasetId?: string;
  onSubmit: (body: TrainModelBody) => Promise<boolean>;
}

const payload = ref<ModelTrainPayload | null>(null);
const prefillDatasetId = ref<string | undefined>();
const {
  datasetOptions,
  loading: datasetLoading,
  reload: reloadDatasets,
  datasetFor,
} = useDatasetOptions({
  prefillId: prefillDatasetId,
  purpose: DATASET_PURPOSES.training,
});

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
      label: $t('page.research.models.train.trainingDataset'),
      rules: 'selectRequired',
    },
  ],
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  onConfirm: () => formApi.validateAndSubmitForm(),
  onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    payload.value = modalApi.getData<ModelTrainPayload>();
    prefillDatasetId.value = payload.value?.trainingDatasetId || undefined;
    formApi.resetForm();
    formApi.setValues({
      training_dataset_id: prefillDatasetId.value,
    });
    formApi.updateSchema([
      { componentProps: { loading: true }, fieldName: 'training_dataset_id' },
    ]);
    void reloadDatasets().then(() => {
      syncDatasetSchema();
      const prefillId = prefillDatasetId.value;
      if (prefillId && !datasetFor(prefillId)) {
        void formApi.setFieldValue('training_dataset_id', undefined);
      }
    });
  },
});
</script>

<template>
  <Modal :title="$t('page.research.models.train.title')">
    <p class="text-muted-foreground mb-4 text-sm">
      {{ $t('page.research.models.train.summary') }}
    </p>
    <Form />
    <Alert
      class="mt-4"
      :message="$t('page.research.models.train.frozenContractHint')"
      show-icon
      type="info"
    />
  </Modal>
</template>

<style scoped>
:deep(.ant-select) {
  width: 100%;
}
</style>
