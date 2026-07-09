<script lang="ts" setup>
import type { RuntimeConfigVersionView, TrainModelRequest } from '@vben/types';

import { computed, markRaw, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Alert, Descriptions, DescriptionsItem } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { listModelSpecs } from '#/api/research';
import { fetchRuntimeConfigVersions } from '#/api/runtime-config';
import { $t } from '#/locales';
import InputNumberWithAddon from '#/shared/components/input-number-with-addon.vue';

import { useTrainableDatasetOptions } from '../../shared/use-trainable-dataset-options';

defineOptions({ name: 'ModelTrainModal' });

/** Domain body collected by the form (governed `reason` is added by the caller). */
export type TrainModelBody = Omit<TrainModelRequest, 'reason'>;

export interface ModelTrainPayload {
  /** Preselected dataset id (from a dataset-row "Train" handoff), if any. */
  trainingDatasetId?: string;
  onSubmit: (body: TrainModelBody) => Promise<boolean>;
}

interface OptionItem {
  label: string;
  value: string;
}

const { handleRequest } = useRequestHandler();

const payload = ref<ModelTrainPayload | null>(null);
const modelSpecId = ref<string | undefined>();
const prefillDatasetId = ref<string | undefined>();
const runtimeConfigVersionId = ref<string | undefined>();
const runtimeVersions = ref<RuntimeConfigVersionView[]>([]);
const {
  datasetOptions,
  loading: datasetLoading,
  reload: reloadDatasets,
} = useTrainableDatasetOptions({
  modelSpecId,
  prefillId: prefillDatasetId,
});

watch(modelSpecId, () => {
  // Force the spinner on before `reload()` resolves — `datasetLoading` flips
  // back to `false` internally by the time `.then()` runs, so syncing only
  // there would never actually show the loading state.
  formApi.updateSchema([
    { componentProps: { loading: true }, fieldName: 'training_dataset_id' },
  ]);
  void reloadDatasets().then(syncDatasetSchema);
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

async function loadOptions() {
  const [specs, versions] = await Promise.all([
    handleRequest(() => listModelSpecs({ size: 200 }), { silent: true }),
    handleRequest(() => fetchRuntimeConfigVersions({ limit: 200 }), {
      silent: true,
    }),
  ]);
  const specOptions: OptionItem[] = (specs?.items ?? []).map((spec) => ({
    label: `${spec.name} · ${spec.model_spec_id}`,
    value: spec.model_spec_id,
  }));
  runtimeVersions.value = versions ?? [];
  const versionOptions: OptionItem[] = runtimeVersions.value.map((version) => ({
    label: version.runtime_config_version_id,
    value: version.runtime_config_version_id,
  }));
  formApi.updateSchema([
    {
      componentProps: { optionFilterProp: 'label', options: specOptions },
      fieldName: 'model_spec_id',
    },
    {
      componentProps: { optionFilterProp: 'label', options: versionOptions },
      fieldName: 'runtime_config_version_id',
    },
  ]);
}

function asRecord(value: unknown): null | Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function field(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  return String(value);
}

const modelFamily = ref<string | undefined>();

const selectedRuntimeVersion = computed(() =>
  runtimeVersions.value.find(
    (version) =>
      version.runtime_config_version_id === runtimeConfigVersionId.value,
  ),
);

const isClassicalFamily = computed(() =>
  (modelFamily.value ?? '').startsWith('classical'),
);

const objectiveSnapshot = computed(() => {
  if (isClassicalFamily.value) {
    return null;
  }
  const config = asRecord(selectedRuntimeVersion.value?.config_json);
  const research = asRecord(config?.research);
  return asRecord(research?.training);
});

async function onSubmit(values: Record<string, unknown>) {
  if (!payload.value) {
    return;
  }
  modalApi.lock();
  try {
    const ok = await payload.value.onSubmit({
      label_horizon_secs: values.label_horizon_secs as number,
      label_name: values.label_name as string,
      model_family: values.model_family as string,
      model_spec_id: values.model_spec_id as string,
      prediction_horizon_secs: values.prediction_horizon_secs as number,
      runtime_config_version_id: values.runtime_config_version_id as string,
      training_dataset_id: values.training_dataset_id as string,
      validation_folds: values.validation_folds as number,
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
        optionFilterProp: 'label',
        options: [],
        showSearch: true,
      },
      dependencies: {
        trigger(values) {
          modelSpecId.value = values.model_spec_id as string | undefined;
        },
        triggerFields: ['model_spec_id'],
      },
      fieldName: 'model_spec_id',
      label: $t('page.research.models.train.modelSpec'),
      rules: 'selectRequired',
    },
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
    {
      component: 'Select',
      componentProps: {
        optionFilterProp: 'label',
        options: [],
        showSearch: true,
      },
      dependencies: {
        trigger(values) {
          runtimeConfigVersionId.value = values.runtime_config_version_id as
            | string
            | undefined;
        },
        triggerFields: ['runtime_config_version_id'],
      },
      fieldName: 'runtime_config_version_id',
      label: $t('page.research.models.train.runtimeConfigVersion'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('page.research.models.train.modelFamilyPlaceholder'),
      },
      dependencies: {
        trigger(values) {
          modelFamily.value = values.model_family as string | undefined;
        },
        triggerFields: ['model_family'],
      },
      defaultValue: 'weighted_factor',
      fieldName: 'model_family',
      label: $t('page.research.models.train.modelFamily'),
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'label_name',
      formItemClass: 'col-span-1',
      label: $t('page.research.models.train.labelName'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { min: 0 },
      defaultValue: 0,
      fieldName: 'label_horizon_secs',
      formItemClass: 'col-span-1',
      label: $t('page.research.models.train.labelHorizonSecs'),
    },
    {
      component: markRaw(InputNumberWithAddon),
      componentProps: { addonAfter: 's', min: 1 },
      defaultValue: 86_400,
      fieldName: 'prediction_horizon_secs',
      help: $t('page.research.models.train.predictionHorizonHelp'),
      label: $t('page.research.models.train.predictionHorizonSecs'),
      modelPropName: 'modelValue',
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { max: 20, min: 2 },
      defaultValue: 3,
      fieldName: 'validation_folds',
      label: $t('page.research.models.train.validationFolds'),
      rules: 'required',
    },
  ],
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});

const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  onConfirm: () => formApi.validateAndSubmitForm(),
  onOpenChange(isOpen) {
    if (isOpen) {
      payload.value = modalApi.getData<ModelTrainPayload>();
      prefillDatasetId.value = payload.value?.trainingDatasetId || undefined;
      modelSpecId.value = undefined;
      runtimeConfigVersionId.value = undefined;
      modelFamily.value = 'weighted_factor';
      runtimeVersions.value = [];
      formApi.resetForm();
      formApi.setValues({
        label_horizon_secs: 0,
        model_family: 'weighted_factor',
        prediction_horizon_secs: 86_400,
        training_dataset_id: payload.value?.trainingDatasetId || undefined,
        validation_folds: 3,
      });
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
  <Modal :title="$t('page.research.models.train.title')">
    <p class="text-muted-foreground mb-4 text-sm">
      {{ $t('page.research.models.train.summary') }}
    </p>
    <Form />
    <div class="mt-4">
      <Alert
        v-if="isClassicalFamily"
        :message="$t('page.research.models.train.classicalObjectiveHint')"
        show-icon
        type="info"
      />
      <Descriptions
        v-else-if="objectiveSnapshot"
        :column="2"
        bordered
        size="small"
        :title="$t('page.research.models.train.objectiveSnapshot')"
      >
        <DescriptionsItem :label="$t('page.research.models.train.rankLoss')">
          {{ field(objectiveSnapshot.rank_loss) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.research.models.train.optimizer')">
          {{ field(objectiveSnapshot.optimizer) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.research.models.train.lambdaTail')">
          {{ field(objectiveSnapshot.lambda_tail) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.models.train.tailFraction')"
        >
          {{ field(objectiveSnapshot.tail_fraction) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.models.train.lambdaTurnover')"
        >
          {{ field(objectiveSnapshot.lambda_turnover) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.research.models.train.lambdaL2')">
          {{ field(objectiveSnapshot.lambda_l2) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.research.models.train.ndcgK')">
          {{ field(objectiveSnapshot.ndcg_k) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.research.models.train.pseudoTopN')">
          {{ field(objectiveSnapshot.pseudo_top_n) }}
        </DescriptionsItem>
      </Descriptions>
      <Alert
        v-else
        :message="$t('page.research.models.train.objectiveSelectHint')"
        show-icon
        type="info"
      />
      <p
        v-if="objectiveSnapshot && !isClassicalFamily"
        class="text-muted-foreground mt-2 text-xs"
      >
        {{ $t('page.research.models.train.objectiveProxyHint') }}
      </p>
    </div>
  </Modal>
</template>

<style scoped>
:deep(.ant-input-number),
:deep(.ant-select) {
  width: 100%;
}
</style>
