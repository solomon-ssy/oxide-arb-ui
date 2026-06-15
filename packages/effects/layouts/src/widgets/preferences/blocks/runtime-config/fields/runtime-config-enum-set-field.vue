<script setup lang="ts">
import type { RuntimeConfigSchemaFieldView } from '@vben/types';

import { computed } from 'vue';

import { $t } from '@vben/locales';

import { VbenCheckbox } from '@vben-core/shadcn-ui';

import { schemaEnumValues } from '../schema-mapper';
import { resolveUiText } from '../ui-text';
import RuntimeConfigFieldHelp from './runtime-config-field-help.vue';

const props = defineProps<{
  disabled?: boolean;
  field: RuntimeConfigSchemaFieldView;
  label: string;
  locale: string;
}>();

const model = defineModel<string[]>({ required: true });

const options = computed(() =>
  (props.field.enum_items ?? []).map((item) => ({
    label: resolveUiText(item.label, props.locale),
    value: String(item.key),
  })).length > 0
    ? (props.field.enum_items ?? []).map((item) => ({
        label: resolveUiText(item.label, props.locale),
        value: String(item.key),
      }))
    : schemaEnumValues(props.field).map((value) => ({
        label: value,
        value,
      })),
);

const showRestrictToggle = computed(
  () => props.field.semantics === 'empty_means_all',
);

/** Empty wire array means "all categories enabled" when semantics say so. */
const restrictSelection = computed({
  get: () => model.value.length > 0,
  set: (restricted: boolean) => {
    if (!restricted) {
      model.value = [];
      return;
    }
    if (model.value.length === 0) {
      model.value = options.value.map((option) => option.value);
    }
  },
});

function toggleOption(value: string, checked: boolean) {
  const next = new Set(model.value);
  if (checked) {
    next.add(value);
  } else {
    next.delete(value);
  }
  model.value = [...next].toSorted();
}

function isChecked(value: string) {
  return model.value.includes(value);
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

    <template v-if="showRestrictToggle">
      <VbenCheckbox v-model="restrictSelection" :disabled="disabled">
        {{ $t('preferences.runtimeConfig.field.restrictCategories') }}
      </VbenCheckbox>
      <p class="text-muted-foreground text-xs">
        {{ resolveUiText(field.help, locale) }}
      </p>
    </template>

    <div
      v-if="!showRestrictToggle || restrictSelection"
      class="grid gap-2 sm:grid-cols-2"
    >
      <VbenCheckbox
        v-for="option in options"
        :key="option.value"
        :disabled="disabled"
        :model-value="isChecked(option.value)"
        @update:model-value="
          (checked) => toggleOption(option.value, Boolean(checked))
        "
      >
        {{ option.label }}
      </VbenCheckbox>
    </div>
  </div>
</template>
