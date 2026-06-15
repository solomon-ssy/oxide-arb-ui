<script setup lang="ts">
import type { RuntimeConfigSchemaFieldView } from '@vben/types';

import { computed } from 'vue';

import { Input } from '@vben-core/shadcn-ui';

import { schemaEnumValues } from '../schema-mapper';
import { resolveUiText } from '../ui-text';
import RuntimeConfigFieldHelp from './runtime-config-field-help.vue';

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
  <div class="my-1 space-y-3 rounded-md px-2 py-2">
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-foreground min-w-0 text-sm font-medium break-words">
        {{ label }}
      </span>
      <RuntimeConfigFieldHelp :help="field.help" :locale="locale" />
    </div>

    <div class="divide-y rounded-md border">
      <div
        v-for="row in rows"
        :key="row.key"
        class="grid items-center gap-3 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_9rem]"
      >
        <span class="text-sm">{{ row.label }}</span>
        <Input
          :disabled="disabled"
          :model-value="row.value"
          class="h-8 font-mono text-xs"
          inputmode="decimal"
          @update:model-value="
            (value) => updateWeight(row.key, String(value ?? ''))
          "
        />
      </div>
    </div>
  </div>
</template>
