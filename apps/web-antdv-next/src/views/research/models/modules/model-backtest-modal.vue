<script lang="ts" setup>
import type { BacktestRequestBody } from './model-backtest-contract';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';
import { DATASET_PURPOSES } from '@vben/types';

import { useVbenForm } from '#/adapter/form';
import { listAllModels } from '#/api/research';
import { $t } from '#/locales';

import { useDatasetOptions } from '../../shared/use-dataset-options';
import { backtestRequestBody } from './model-backtest-contract';

defineOptions({ name: 'ModelBacktestModal' });

/** Domain body collected by the form (governed `reason` is added by the caller). */
export type BacktestBody = BacktestRequestBody;

export interface ModelBacktestPayload {
  /** Model version the backtest replays (path id). */
  modelVersionId: string;
  /** Evaluation datasets and pair baselines must share this immutable spec. */
  modelSpecId: string;
  onSubmit: (body: BacktestBody) => Promise<boolean>;
}

interface OptionItem {
  label: string;
  value: string;
}

const { handleRequest } = useRequestHandler();

const payload = ref<ModelBacktestPayload | null>(null);
const modelSpecId = ref<string | undefined>();
const {
  datasetFor,
  datasetOptions,
  loading: datasetLoading,
  reload: reloadDatasets,
} = useDatasetOptions({
  modelSpecId,
  purpose: DATASET_PURPOSES.evaluation,
});

async function loadOptions() {
  formApi.updateSchema([
    {
      componentProps: { loading: true },
      fieldName: 'comparison_model_version_id',
    },
  ]);
  const page = await handleRequest(() => listAllModels(), { silent: true });
  const currentId = payload.value?.modelVersionId;
  const currentSpecId = payload.value?.modelSpecId;
  const comparisonOptions: OptionItem[] = (page ?? [])
    .filter(
      (model) =>
        model.model_version_id !== currentId &&
        model.model_spec_id === currentSpecId,
    )
    .map((model) => ({
      label: `${model.model_version_id} · v${model.version} · ${model.model_family}`,
      value: model.model_version_id,
    }));
  formApi.updateSchema([
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
        placeholder: $t(
          'page.research.models.backtest.evaluationDatasetPlaceholder',
        ),
      },
      fieldName: 'evaluation_dataset_id',
    },
  ]);
}

function bindEvaluationDataset(value: unknown) {
  const selected = typeof value === 'string' ? datasetFor(value) : undefined;
  void formApi.setFieldValue(
    'decision_policy_snapshot_id',
    selected?.decision_policy_snapshot_id,
  );
}

async function onSubmit(values: Record<string, unknown>) {
  if (!payload.value) {
    return;
  }
  const body = backtestRequestBody(values);
  if (!body) {
    return;
  }
  modalApi.lock();
  try {
    const ok = await payload.value.onSubmit(body);
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
        onChange: bindEvaluationDataset,
        optionFilterProp: 'label',
        options: [],
        placeholder: $t(
          'page.research.models.backtest.evaluationDatasetPlaceholder',
        ),
        showSearch: true,
      },
      fieldName: 'evaluation_dataset_id',
      label: $t('page.research.models.backtest.evaluationDataset'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: {
        disabled: true,
        placeholder: $t('page.research.models.backtest.decisionPolicyDerived'),
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
  ],
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  onConfirm: () => formApi.validateAndSubmitForm(),
  onOpenChange(isOpen) {
    if (isOpen) {
      payload.value = modalApi.getData<ModelBacktestPayload>();
      modelSpecId.value = payload.value?.modelSpecId;
      formApi.resetForm();
      formApi.setValues({
        decision_policy_snapshot_id: undefined,
        evaluation_dataset_id: undefined,
      });
      // Force the spinner on before `reload()` resolves — `datasetLoading`
      // flips back to `false` internally by the time `.then()` runs, so
      // syncing only there would never actually show the loading state.
      formApi.updateSchema([
        {
          componentProps: { loading: true },
          fieldName: 'evaluation_dataset_id',
        },
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
