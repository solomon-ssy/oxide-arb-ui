<script lang="ts" setup>
import type { CreateModelSpecRequest, ModelFamily } from '@vben/types';

import { markRaw, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';
import { EMPTY_FEATURE_REQUIREMENTS, MODEL_FAMILIES } from '@vben/types';

import { message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { listModelSpecs } from '#/api/research';
import { $t } from '#/locales';
import InputNumberWithAddon from '#/shared/components/input-number-with-addon.vue';

import FeatureRequirementsEditor from './feature-requirements-editor.vue';

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
  const page = await handleRequest(() => listModelSpecs({ size: 500 }), {
    silent: true,
  });
  existingNames.value = new Set(
    (page?.items ?? []).map((row) => row.name.trim().toLowerCase()),
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
  modalApi.lock();
  try {
    const ok = await payload.value.onSubmit({
      feature_schema_version: values.feature_schema_version as number,
      feature_requirements:
        values.feature_requirements as CreateModelSpecBody['feature_requirements'],
      label_schema_version: values.label_schema_version as number,
      model_family: values.model_family as ModelFamily,
      name: trimmed,
      prediction_horizon_secs: values.prediction_horizon_secs as number,
      spec_json: values.spec_json ?? {},
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
      componentProps: { min: 1 },
      defaultValue: 5,
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
      component: markRaw(FeatureRequirementsEditor),
      defaultValue: { ...EMPTY_FEATURE_REQUIREMENTS, by_category: {} },
      fieldName: 'feature_requirements',
      label: $t('page.research.modelSpecs.create.featureRequirements'),
      modelPropName: 'modelValue',
    },
    {
      component: 'JsonEditor',
      componentProps: { variant: 'field' },
      defaultValue: {},
      fieldName: 'spec_json',
      help: $t('page.research.modelSpecs.create.specJsonHelp'),
      label: $t('page.research.modelSpecs.create.specJson'),
      modelPropName: 'modelValue',
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
        feature_requirements: {
          ...EMPTY_FEATURE_REQUIREMENTS,
          by_category: {},
        },
        feature_schema_version: 5,
        label_schema_version: 1,
        model_family: MODEL_FAMILIES.weightedFactor,
        prediction_horizon_secs: 86_400,
        spec_json: {},
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
