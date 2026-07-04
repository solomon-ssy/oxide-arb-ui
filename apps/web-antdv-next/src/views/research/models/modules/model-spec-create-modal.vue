<script lang="ts" setup>
import type { CreateModelSpecRequest, ModelFamily } from '@vben/types';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Input, InputNumber, message, Select } from 'antdv-next';

import { $t } from '#/locales';
import InputNumberWithAddon from '#/shared/components/input-number-with-addon.vue';
import JsonEditorShell from '#/shared/components/json-editor/json-editor-shell.vue';

defineOptions({ name: 'ModelSpecCreateModal' });

/** Domain body collected by the form (governed `reason` is added by the caller). */
export type CreateModelSpecBody = Omit<CreateModelSpecRequest, 'reason'>;

export interface ModelSpecCreatePayload {
  onSubmit: (body: CreateModelSpecBody) => Promise<boolean>;
}

const FAMILY_OPTIONS: { label: string; value: ModelFamily }[] = [
  { label: 'weighted_factor (Buy ranker)', value: 'weighted_factor' },
  {
    label: 'hold_vs_exit_weighted (Sell/exit)',
    value: 'hold_vs_exit_weighted',
  },
  { label: 'classical_random_forest', value: 'classical_random_forest' },
  { label: 'classical_extra_trees', value: 'classical_extra_trees' },
  {
    label: 'classical_logistic_regression',
    value: 'classical_logistic_regression',
  },
  { label: 'classical_ridge', value: 'classical_ridge' },
  { label: 'classical_lasso', value: 'classical_lasso' },
  { label: 'classical_elastic_net', value: 'classical_elastic_net' },
];

const payload = ref<ModelSpecCreatePayload | null>(null);

const name = ref<string>('');
const modelFamily = ref<ModelFamily>('weighted_factor');
const predictionHorizonSecs = ref<number>(86_400);
const featureSchemaVersion = ref<number>(1);
const labelSchemaVersion = ref<number>(1);
const specJson = ref<unknown>({});

function reset() {
  name.value = '';
  modelFamily.value = 'weighted_factor';
  predictionHorizonSecs.value = 86_400;
  featureSchemaVersion.value = 1;
  labelSchemaVersion.value = 1;
  specJson.value = {};
}

const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  async onConfirm() {
    if (!name.value.trim() || predictionHorizonSecs.value < 1) {
      message.warning($t('page.research.modelSpecs.create.incomplete'));
      return;
    }
    if (!payload.value) {
      return;
    }
    modalApi.lock();
    try {
      const ok = await payload.value.onSubmit({
        feature_schema_version: featureSchemaVersion.value,
        label_schema_version: labelSchemaVersion.value,
        model_family: modelFamily.value,
        name: name.value.trim(),
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
