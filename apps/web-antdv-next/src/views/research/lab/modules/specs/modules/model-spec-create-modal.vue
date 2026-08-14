<script lang="ts" setup>
import type {
  CreateModelSpecRequest,
  FeatureContractView,
  ModelFamily,
  ModelTrainingContract,
} from '@vben/types';

import { markRaw, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';
import { EMPTY_MODEL_INPUT_CONTRACT, MODEL_FAMILIES } from '@vben/types';

import { message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { listAllModelSpecs } from '#/api/research';
import { $t } from '#/locales';
import InputNumberWithAddon from '#/shared/components/input-number-with-addon.vue';

import InputContractEditor from './input-contract-editor.vue';
import {
  DEFAULT_MODEL_TRAINING_CONTRACT,
  normalizeModelTrainingContract,
  trainingContractForModel,
} from './model-training-contract';
import TrainingContractEditor from './training-contract-editor.vue';

defineOptions({ name: 'ModelSpecCreateModal' });

/** Domain body collected by the form (governed `reason` is added by the caller). */
export type CreateModelSpecBody = Omit<CreateModelSpecRequest, 'reason'>;

export interface ModelSpecCreatePayload {
  onSubmit: (body: CreateModelSpecBody) => Promise<boolean>;
}

const FAMILY_OPTIONS = Object.values(MODEL_FAMILIES).map((value) => ({
  label: $t(`enum.modelFamily.${value}`),
  value,
}));

const { handleRequest } = useRequestHandler();

const payload = ref<ModelSpecCreatePayload | null>(null);
const existingNames = ref<Set<string>>(new Set());

async function loadExistingNames() {
  const rows = await handleRequest(() => listAllModelSpecs(), {
    silent: true,
  });
  existingNames.value = new Set(
    (rows ?? []).map((row) => row.name.trim().toLowerCase()),
  );
}

async function onSubmit(values: Record<string, unknown>) {
  const trimmed = String(values.name ?? '').trim();
  if (existingNames.value.has(trimmed.toLowerCase())) {
    message.error(
      $t('page.research.modelSpecs.create.duplicateName', { name: trimmed }),
    );
    return;
  }
  if (!payload.value) {
    return;
  }
  const inputContract =
    values.input_contract as CreateModelSpecBody['input_contract'];
  const modelFamily = values.model_family as ModelFamily;
  const predictionHorizonSecs = Number(values.prediction_horizon_secs);
  const trainingContract = normalizeModelTrainingContract(
    values.training_contract as ModelTrainingContract | undefined,
    modelFamily,
    predictionHorizonSecs,
  );
  if (!trainingContract) {
    message.error(
      $t('page.research.modelSpecs.trainingContract.validationError'),
    );
    return;
  }
  const featureSchemaVersion = Number(values.feature_schema_version);
  if (!Number.isInteger(featureSchemaVersion) || featureSchemaVersion < 1) {
    message.error(
      $t('page.research.modelSpecs.inputContract.catalogRequiredError'),
    );
    return;
  }
  if (!inputContract?.inputs.length) {
    message.error($t('page.research.modelSpecs.inputContract.requiredError'));
    return;
  }
  const thesisSummary = String(values.thesis_summary ?? '').trim();
  const thesisHypothesis = String(values.thesis_hypothesis ?? '').trim();
  const thesisLimitations = String(values.thesis_limitations ?? '')
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);
  if (
    !thesisSummary ||
    !thesisHypothesis ||
    thesisLimitations.length === 0 ||
    thesisLimitations.length > 16 ||
    new Set(thesisLimitations).size !== thesisLimitations.length
  ) {
    message.error($t('page.research.modelSpecs.create.thesisValidationError'));
    return;
  }
  modalApi.lock();
  try {
    const ok = await payload.value.onSubmit({
      feature_schema_version: featureSchemaVersion,
      input_contract: inputContract,
      label_schema_version: values.label_schema_version as number,
      model_family: modelFamily,
      name: trimmed,
      prediction_horizon_secs: predictionHorizonSecs,
      thesis: {
        hypothesis: thesisHypothesis,
        limitations: thesisLimitations,
        summary: thesisSummary,
      },
      training_contract: trainingContract,
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
      component: 'Input',
      componentProps: {
        placeholder: $t('page.research.modelSpecs.create.namePlaceholder'),
      },
      fieldName: 'name',
      label: $t('page.research.modelSpecs.create.name'),
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: { options: FAMILY_OPTIONS },
      defaultValue: MODEL_FAMILIES.weightedFactor,
      fieldName: 'model_family',
      label: $t('page.research.modelSpecs.create.modelFamily'),
      rules: 'selectRequired',
    },
    {
      component: markRaw(InputNumberWithAddon),
      componentProps: { addonAfter: 's', min: 1 },
      defaultValue: 86_400,
      fieldName: 'prediction_horizon_secs',
      label: $t('page.research.modelSpecs.create.predictionHorizonSecs'),
      modelPropName: 'modelValue',
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { disabled: true, min: 1 },
      fieldName: 'feature_schema_version',
      formItemClass: 'col-span-1',
      label: $t('page.research.modelSpecs.create.featureSchemaVersion'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { min: 1 },
      defaultValue: 1,
      fieldName: 'label_schema_version',
      formItemClass: 'col-span-1',
      label: $t('page.research.modelSpecs.create.labelSchemaVersion'),
      rules: 'required',
    },
    {
      component: markRaw(TrainingContractEditor),
      defaultValue: { ...DEFAULT_MODEL_TRAINING_CONTRACT },
      dependencies: {
        trigger(values) {
          const current = values.training_contract as
            | ModelTrainingContract
            | undefined;
          if (!current) return;
          const next = trainingContractForModel(
            current,
            values.model_family as ModelFamily,
            Number(values.prediction_horizon_secs),
          );
          if (next) {
            void formApi.setFieldValue('training_contract', next);
          }
        },
        triggerFields: ['model_family', 'prediction_horizon_secs'],
      },
      fieldName: 'training_contract',
      formItemClass: 'md:col-span-2',
      label: $t('page.research.modelSpecs.create.trainingContract'),
      modelPropName: 'modelValue',
    },
    {
      component: markRaw(InputContractEditor),
      componentProps: {
        onCatalogLoaded(contract: FeatureContractView) {
          void formApi.setFieldValue(
            'feature_schema_version',
            contract.feature_schema_version,
          );
        },
      },
      defaultValue: { ...EMPTY_MODEL_INPUT_CONTRACT, inputs: [] },
      fieldName: 'input_contract',
      label: $t('page.research.modelSpecs.create.inputContract'),
      modelPropName: 'modelValue',
    },
    {
      component: 'Textarea',
      componentProps: { maxlength: 512, rows: 2, showCount: true },
      fieldName: 'thesis_summary',
      formItemClass: 'md:col-span-2',
      help: $t('page.research.modelSpecs.create.thesisSummaryHelp'),
      label: $t('page.research.modelSpecs.create.thesisSummary'),
      rules: 'required',
    },
    {
      component: 'Textarea',
      componentProps: { maxlength: 2048, rows: 3, showCount: true },
      fieldName: 'thesis_hypothesis',
      formItemClass: 'md:col-span-2',
      help: $t('page.research.modelSpecs.create.thesisHypothesisHelp'),
      label: $t('page.research.modelSpecs.create.thesisHypothesis'),
      rules: 'required',
    },
    {
      component: 'Textarea',
      componentProps: { rows: 4 },
      fieldName: 'thesis_limitations',
      formItemClass: 'md:col-span-2',
      help: $t('page.research.modelSpecs.create.thesisLimitationsHelp'),
      label: $t('page.research.modelSpecs.create.thesisLimitations'),
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
      payload.value = modalApi.getData<ModelSpecCreatePayload>();
      formApi.resetForm();
      formApi.setValues({
        input_contract: { ...EMPTY_MODEL_INPUT_CONTRACT, inputs: [] },
        feature_schema_version: undefined,
        label_schema_version: 1,
        model_family: MODEL_FAMILIES.weightedFactor,
        prediction_horizon_secs: 86_400,
        thesis_hypothesis: undefined,
        thesis_limitations: undefined,
        thesis_summary: undefined,
        training_contract: { ...DEFAULT_MODEL_TRAINING_CONTRACT },
      });
      void loadExistingNames();
    }
  },
});
</script>

<template>
  <Modal :title="$t('page.research.modelSpecs.create.title')">
    <p class="text-muted-foreground mb-4 text-sm">
      {{ $t('page.research.modelSpecs.create.summary') }}
    </p>
    <Form />
  </Modal>
</template>

<style scoped>
:deep(.ant-input-number),
:deep(.ant-select) {
  width: 100%;
}
</style>
