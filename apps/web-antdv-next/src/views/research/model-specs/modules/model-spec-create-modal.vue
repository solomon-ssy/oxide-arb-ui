<script lang="ts" setup>
import type { CreateModelSpecRequest, ModelFamily } from '@vben/types';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';
import { EMPTY_FEATURE_REQUIREMENTS, MODEL_FAMILIES } from '@vben/types';

import { Input, InputNumber, message, Select } from 'antdv-next';

import { listModelSpecs } from '#/api/research';
import { $t } from '#/locales';
import InputNumberWithAddon from '#/shared/components/input-number-with-addon.vue';
import JsonEditorShell from '#/shared/components/json-editor/json-editor-shell.vue';

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

const name = ref<string>('');
const modelFamily = ref<ModelFamily>(MODEL_FAMILIES.weightedFactor);
const predictionHorizonSecs = ref<number>(86_400);
const featureSchemaVersion = ref<number>(5);
const labelSchemaVersion = ref<number>(1);
const specJson = ref<unknown>({});
const featureRequirements = ref({ ...EMPTY_FEATURE_REQUIREMENTS });

function reset() {
  name.value = '';
  modelFamily.value = MODEL_FAMILIES.weightedFactor;
  predictionHorizonSecs.value = 86_400;
  featureSchemaVersion.value = 5;
  labelSchemaVersion.value = 1;
  specJson.value = {};
  featureRequirements.value = {
    ...EMPTY_FEATURE_REQUIREMENTS,
    by_category: {},
  };
}

async function loadExistingNames() {
  const page = await handleRequest(() => listModelSpecs({ size: 500 }), {
    silent: true,
  });
  existingNames.value = new Set(
    (page?.items ?? []).map((row) => row.name.trim().toLowerCase()),
  );
}

const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  async onConfirm() {
    const trimmed = name.value.trim();
    if (!trimmed || predictionHorizonSecs.value < 1) {
      message.warning($t('page.research.modelSpecs.create.incomplete'));
      return;
    }
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
        feature_schema_version: featureSchemaVersion.value,
        feature_requirements: featureRequirements.value,
        label_schema_version: labelSchemaVersion.value,
        model_family: modelFamily.value,
        name: trimmed,
        prediction_horizon_secs: predictionHorizonSecs.value,
        spec_json: specJson.value ?? {},
      });
      if (ok) {
        modalApi.close();
      }
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      reset();
      payload.value = modalApi.getData<ModelSpecCreatePayload>();
      void loadExistingNames();
    }
  },
});
</script>

<template>
  <Modal :title="$t('page.research.modelSpecs.create.title')">
    <div class="flex flex-col gap-4">
      <p class="text-muted-foreground text-sm">
        {{ $t('page.research.modelSpecs.create.summary') }}
      </p>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.research.modelSpecs.create.name') }}
        </span>
        <Input
          v-model:value="name"
          :placeholder="$t('page.research.modelSpecs.create.namePlaceholder')"
        />
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.research.modelSpecs.create.modelFamily') }}
        </span>
        <Select v-model:value="modelFamily" :options="FAMILY_OPTIONS" />
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.research.modelSpecs.create.predictionHorizonSecs') }}
        </span>
        <InputNumberWithAddon
          v-model="predictionHorizonSecs"
          :min="1"
          addon-after="s"
        />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <span class="text-sm font-medium">
            {{ $t('page.research.modelSpecs.create.featureSchemaVersion') }}
          </span>
          <InputNumber
            v-model:value="featureSchemaVersion"
            :min="1"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-sm font-medium">
            {{ $t('page.research.modelSpecs.create.labelSchemaVersion') }}
          </span>
          <InputNumber
            v-model:value="labelSchemaVersion"
            :min="1"
            class="w-full"
          />
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.research.modelSpecs.create.featureRequirements') }}
        </span>
        <FeatureRequirementsEditor v-model="featureRequirements" />
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.research.modelSpecs.create.specJson') }}
        </span>
        <JsonEditorShell v-model="specJson" variant="field" />
        <p class="text-muted-foreground text-xs">
          {{ $t('page.research.modelSpecs.create.specJsonHelp') }}
        </p>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
:deep(.ant-input-number),
:deep(.ant-select) {
  width: 100%;
}
</style>
