<script setup lang="ts">
import type { RuntimeConfigSchemaFieldView } from '@vben/types';

import { computed } from 'vue';

import { Input } from 'antdv-next';

import { schemaEnumValues } from '../schema-mapper';
import { resolveUiText } from '../ui-text';
import RuntimeConfigFieldShell from './runtime-config-field-shell.vue';

const props = defineProps<{
  disabled?: boolean;
  field: RuntimeConfigSchemaFieldView;
  label: string;
  locale: string;
}>();

const model = defineModel<Record<string, string>>({ required: true });

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

function updateWeight(key: string, value: string) {
  model.value = {
    ...model.value,
    [key]: value,
  };
}
</script>

<template>
  <RuntimeConfigFieldShell :field="field" :label="label" :locale="locale">
    <div
      class="border-border divide-border divide-y overflow-hidden rounded-md border"
    >
      <div
        v-for="row in rows"
        :key="row.key"
        class="grid items-center gap-3 bg-muted/15 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_9rem]"
      >
        <span class="text-sm">{{ row.label }}</span>
        <Input
          :disabled="disabled"
          :value="row.value"
          class="font-mono text-xs"
          inputmode="decimal"
          @update:value="
            (value: string) => updateWeight(row.key, String(value ?? ''))
          "
        />
      </div>
    </div>
  </RuntimeConfigFieldShell>
</template>
