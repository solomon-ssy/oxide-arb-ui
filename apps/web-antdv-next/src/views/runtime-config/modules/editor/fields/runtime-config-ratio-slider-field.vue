<script setup lang="ts">
import type { RuntimeConfigSchemaFieldView } from '@vben/types';

import { computed } from 'vue';

import { InputNumber, Slider } from 'antdv-next';
import Decimal from 'decimal.js';

import { normalizeDecimalString } from '../schema-mapper';
import RuntimeConfigFieldShell from './runtime-config-field-shell.vue';

const props = defineProps<{
  disabled?: boolean;
  field: RuntimeConfigSchemaFieldView;
  label: string;
  locale: string;
}>();

const model = defineModel<string>({ required: true });

const sliderMin = computed(() => props.field.ui_props?.slider_min ?? 0);
const sliderMax = computed(() => props.field.ui_props?.slider_max ?? 1);
const sliderStep = computed(() => props.field.ui_props?.slider_step ?? 0.01);

const sliderStyles = {
  rail: { backgroundColor: 'hsl(var(--muted))' },
  track: { backgroundColor: 'hsl(var(--primary))' },
};

const numeric = computed({
  get: () => {
    const text = String(model.value ?? '').trim();
    if (!text) {
      return sliderMin.value;
    }
    try {
      const parsed = new Decimal(text).toNumber();
      return Number.isFinite(parsed)
        ? Math.min(sliderMax.value, Math.max(sliderMin.value, parsed))
        : sliderMin.value;
    } catch {
      return sliderMin.value;
    }
  },
  set: (value: null | number) => {
    const next = value ?? sliderMin.value;
    try {
      model.value = normalizeDecimalString(next);
    } catch {
      model.value = String(next);
    }
  },
});

const percentLabel = computed(() => `${Math.round(numeric.value * 100)}%`);
</script>

<template>
  <RuntimeConfigFieldShell :field="field" :label="label" :locale="locale">
    <div class="runtime-config-ratio-slider">
      <Slider
        v-model:value="numeric"
        :disabled="disabled"
        :max="sliderMax"
        :min="sliderMin"
        :step="sliderStep"
        :styles="sliderStyles"
        class="runtime-config-ratio-slider__track w-full min-w-0"
      />
      <div class="runtime-config-ratio-slider__controls">
        <InputNumber
          v-model:value="numeric"
          :disabled="disabled"
          :max="sliderMax"
          :min="sliderMin"
          :step="sliderStep"
          class="runtime-config-ratio-slider__input"
        />
        <span
          class="text-muted-foreground shrink-0 text-right text-xs tabular-nums"
        >
          {{ percentLabel }}
        </span>
      </div>
    </div>
  </RuntimeConfigFieldShell>
</template>

<style scoped>
.runtime-config-ratio-slider {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
}

.runtime-config-ratio-slider__track :deep(.ant-slider) {
  width: 100%;
  margin: 0;
}

.runtime-config-ratio-slider__controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.runtime-config-ratio-slider__input {
  width: 5.5rem;
}

.runtime-config-ratio-slider__input :deep(.ant-input-number) {
  width: 100%;
}
</style>
