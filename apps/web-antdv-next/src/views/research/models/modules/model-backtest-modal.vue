<script lang="ts" setup>
import type { RunBacktestRequest } from '@vben/types';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { useVbenForm } from '#/adapter/form';
import { fetchDecisionPolicySnapshots } from '#/api/config';
import { listAllModels } from '#/api/research';
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
  onSubmit: (body: BacktestBody) => Promise<boolean>;
}

interface OptionItem {
  label: string;
  value: string;
}

const { handleRequest } = useRequestHandler();

const payload = ref<ModelBacktestPayload | null>(null);
const prefillDatasetId = ref<string | undefined>();
const {
  datasetOptions,
  loading: datasetLoading,
  reload: reloadDatasets,
} = useTrainableDatasetOptions({ prefillId: prefillDatasetId });

async function loadOptions() {
  // `handleRequest` never rejects (errors are normalized + toasted internally),
  // so `loading: false` in the post-fetch `updateSchema` below always runs.
  formApi.updateSchema([
    {
      componentProps: { loading: true },
      fieldName: 'comparison_model_version_id',
    },
  ]);
  const [versions, page] = await Promise.all([
    handleRequest(() => fetchDecisionPolicySnapshots({ limit: 200 }), {
      silent: true,
    }),
    handleRequest(() => listAllModels(), { silent: true }),
  ]);
  const versionOptions: OptionItem[] = (versions ?? []).map((version) => ({
    label: version.decision_policy_snapshot_id,
    value: version.decision_policy_snapshot_id,
  }));
  const currentId = payload.value?.modelVersionId;
  const comparisonOptions: OptionItem[] = (page ?? [])
    .filter((model) => model.model_version_id !== currentId)
    .map((model) => ({
      label: `${model.model_version_id} · v${model.version} · ${model.publication_status}`,
      value: model.model_version_id,
    }));
  formApi.updateSchema([
    {
      componentProps: { optionFilterProp: 'label', options: versionOptions },
      fieldName: 'decision_policy_snapshot_id',
    },
    {
      componentProps: {
        allowClear: true,
        loading: false,
        optionFilterProp: 'label',
        options: comparisonOptions,
      },
      fieldName: 'comparison_model_version_id',
    },
  ]);
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
      calibrate: Boolean(values.calibrate),
      comparison_model_version_id:
        (values.comparison_model_version_id as string | undefined) || undefined,
      decision_policy_snapshot_id: values.decision_policy_snapshot_id as string,
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
      label: $t('page.research.models.backtest.trainingDataset'),
      rules: 'selectRequired',
    },
    {
      component: 'Select',
      componentProps: {
        optionFilterProp: 'label',
        options: [],
        showSearch: true,
      },
      fieldName: 'decision_policy_snapshot_id',
      label: $t('page.research.models.backtest.decisionPolicySnapshot'),
      rules: 'selectRequired',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        loading: false,
        optionFilterProp: 'label',
        options: [],
        placeholder: $t('page.research.models.backtest.comparisonPlaceholder'),
        showSearch: true,
      },
      fieldName: 'comparison_model_version_id',
      label: $t('page.research.models.backtest.comparisonModel'),
    },
    {
      component: 'Switch',
      defaultValue: false,
      fieldName: 'calibrate',
      label: $t('page.research.models.backtest.calibrate'),
    },
  ],
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  onConfirm: () => formApi.validateAndSubmitForm(),
  onOpenChange(isOpen) {
    if (isOpen) {
      payload.value = modalApi.getData<ModelBacktestPayload>();
      prefillDatasetId.value = payload.value?.trainingDatasetId || undefined;
      formApi.resetForm();
      formApi.setValues({
        calibrate: false,
        training_dataset_id: payload.value?.trainingDatasetId || undefined,
      });
      // Force the spinner on before `reload()` resolves — `datasetLoading`
      // flips back to `false` internally by the time `.then()` runs, so
      // syncing only there would never actually show the loading state.
      formApi.updateSchema([
        { componentProps: { loading: true }, fieldName: 'training_dataset_id' },
      ]);
      void reloadDatasets().then(syncDatasetSchema);
      void loadOptions();
    }
  },
});
</script>

<template>
  <Modal :title="$t('page.research.models.backtest.title')">
    <p class="text-muted-foreground mb-4 text-sm">
      {{ $t('page.research.models.backtest.summary') }}
    </p>
    <Form />
  </Modal>
</template>
