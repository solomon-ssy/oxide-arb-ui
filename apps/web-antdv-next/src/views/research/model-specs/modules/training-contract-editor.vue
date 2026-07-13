<script lang="ts" setup>
import type { ModelTrainingContract } from '@vben/types';

import { computed } from 'vue';

import { Input, InputNumber } from 'antdv-next';

import { $t } from '#/locales';

defineOptions({ name: 'TrainingContractEditor' });

const model = defineModel<ModelTrainingContract>({ required: true });

const targetLabelName = computed({
  get: () => model.value.target_label_name,
  set: (value: string) => {
    model.value = { ...model.value, target_label_name: value };
  },
});

const targetLabelHorizon = computed({
  get: () => model.value.target_label_horizon_secs,
  set: (value: null | number) => {
    model.value = {
      ...model.value,
      target_label_horizon_secs: value as number,
    };
  },
});

const validationFolds = computed({
  get: () => model.value.validation_folds,
  set: (value: null | number) => {
    model.value = { ...model.value, validation_folds: value as number };
  },
});
</script>

<template>
  <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
    <label class="flex flex-col gap-1 md:col-span-3">
      <span class="text-xs font-medium">
        {{ $t('page.research.modelSpecs.trainingContract.targetLabelName') }}
      </span>
      <Input
        v-model:value="targetLabelName"
        :maxlength="128"
        :placeholder="
          $t('page.research.modelSpecs.trainingContract.targetLabelPlaceholder')
        "
      />
    </label>
    <label class="flex flex-col gap-1 md:col-span-2">
      <span class="text-xs font-medium">
        {{
          $t('page.research.modelSpecs.trainingContract.targetLabelHorizonSecs')
        }}
      </span>
      <InputNumber v-model:value="targetLabelHorizon" :min="0" :precision="0" />
    </label>
    <label class="flex flex-col gap-1">
      <span class="text-xs font-medium">
        {{ $t('page.research.modelSpecs.trainingContract.validationFolds') }}
      </span>
      <InputNumber
        v-model:value="validationFolds"
        :max="20"
        :min="2"
        :precision="0"
      />
    </label>
    <p class="text-muted-foreground text-xs md:col-span-3">
      {{ $t('page.research.modelSpecs.trainingContract.help') }}
    </p>
  </div>
</template>

<style scoped>
:deep(.ant-input-number) {
  width: 100%;
}
</style>
