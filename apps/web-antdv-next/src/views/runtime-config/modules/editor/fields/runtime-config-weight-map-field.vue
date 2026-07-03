<script setup lang="ts">
import type { RuntimeConfigSchemaFieldView } from '@vben/types';

import { computed } from 'vue';

import { InputNumber, Slider, Tag } from 'antdv-next';
import Decimal from 'decimal.js';

import { $t } from '#/locales';

import { normalizeDecimalString, schemaEnumValues } from '../schema-mapper';
import { resolveUiText } from '../ui-text';
import RuntimeConfigFieldShell from './runtime-config-field-shell.vue';

const props = defineProps<{
  disabled?: boolean;
  field: RuntimeConfigSchemaFieldView;
  label: string;
  locale: string;
}>();

const model = defineModel<Record<string, string>>({ required: true });

const sliderStyles = {
  rail: { backgroundColor: 'hsl(var(--muted))' },
  track: { backgroundColor: 'hsl(var(--primary))' },
};

const rows = computed(() =>
  schemaEnumValues(props.field).map((key) => {
    const enumItem = props.field.enum_items?.find(
      (item) => String(item.key) === key,
    );
    return {
      key,
      label: enumItem?.label
        ? resolveUiText(enumItem.label, props.locale)
        : key,
      value: model.value[key] ?? '',
    };
  }),
);

const weightSum = computed(() => {
  let sum = new Decimal(0);
  for (const row of rows.value) {
    const text = row.value.trim();
    if (!text) {
      continue;
    }
    try {
      sum = sum.plus(new Decimal(text));
    } catch {
      // ignore invalid partial input while editing
    }
  }
  return sum;
});

const sumIsValid = computed(() => {
  if (rows.value.every((row) => !row.value.trim())) {
    return true;
  }
  return weightSum.value.minus(1).abs().lte(new Decimal('0.0001'));
});

function parseWeight(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }
  try {
    const parsed = new Decimal(trimmed).toNumber();
    return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0;
  } catch {
    return 0;
  }
}

function updateWeight(key: string, value: null | number | string) {
  const numeric =
    typeof value === 'number' ? value : parseWeight(String(value ?? ''));
  let wire = '';
  if (numeric > 0) {
    try {
      wire = normalizeDecimalString(numeric);
    } catch {
      wire = String(numeric);
    }
  }
  model.value = {
    ...model.value,
    [key]: wire,
  };
}
</script>

<template>
  <RuntimeConfigFieldShell :field="field" :label="label" :locale="locale">
    <div class="mb-2 flex items-center gap-2 text-xs">
      <span class="text-muted-foreground">
        {{ $t('page.runtimeConfig.editor.weightMap.sum') }}
      </span>
      <Tag :color="sumIsValid ? 'success' : 'warning'" class="m-0 tabular-nums">
        {{ weightSum.toFixed(4) }}
      </Tag>
    </div>

    <div
      class="border-border divide-border divide-y overflow-hidden rounded-md border"
    >
      <div
        v-for="row in rows"
        :key="row.key"
        class="grid items-center gap-3 bg-muted/15 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_5rem]"
      >
        <span class="text-sm">{{ row.label }}</span>
        <Slider
          :disabled="disabled"
          :max="1"
          :min="0"
          :step="0.01"
          :styles="sliderStyles"
          :value="parseWeight(row.value)"
          class="runtime-config-weight-slider w-full min-w-0"
          @update:value="(value) => updateWeight(row.key, value)"
        />
        <InputNumber
          :disabled="disabled"
          :max="1"
          :min="0"
          :step="0.01"
          :value="parseWeight(row.value)"
          class="w-full"
          @update:value="(value) => updateWeight(row.key, value)"
        />
      </div>
    </div>
  </RuntimeConfigFieldShell>
</template>

<style scoped>
.runtime-config-weight-slider :deep(.ant-slider) {
  width: 100%;
  margin: 0;
}

:deep(.ant-input-number) {
  width: 100%;
}
</style>
