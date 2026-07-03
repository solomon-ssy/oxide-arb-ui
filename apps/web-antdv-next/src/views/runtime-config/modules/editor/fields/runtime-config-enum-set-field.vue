<script setup lang="ts">
import type { RuntimeConfigSchemaFieldView } from '@vben/types';

import { computed } from 'vue';

import { Checkbox } from 'antdv-next';

import { $t } from '#/locales';

import { schemaEnumValues } from '../schema-mapper';
import { resolveUiText } from '../ui-text';
import RuntimeConfigFieldShell from './runtime-config-field-shell.vue';

const props = defineProps<{
  disabled?: boolean;
  field: RuntimeConfigSchemaFieldView;
  label: string;
  locale: string;
}>();

const model = defineModel<string[]>({ required: true });

const options = computed(() => {
  const items = (props.field.enum_items ?? []).map((item) => ({
    label: resolveUiText(item.label, props.locale),
    value: String(item.key),
  }));
  return items.length > 0
    ? items
    : schemaEnumValues(props.field).map((value) => ({ label: value, value }));
});

const showRestrictToggle = computed(
  () => props.field.semantics === 'empty_means_all',
);

/** Empty wire array means "all" when semantics say so. */
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
  <RuntimeConfigFieldShell :field="field" :label="label" :locale="locale">
    <template v-if="showRestrictToggle">
      <Checkbox v-model:checked="restrictSelection" :disabled="disabled">
        {{ $t('page.runtimeConfig.editor.field.restrictCategories') }}
      </Checkbox>
      <p class="text-muted-foreground mb-2 text-xs">
        {{ resolveUiText(field.help, locale) }}
      </p>
    </template>

    <div
      v-if="!showRestrictToggle || restrictSelection"
      class="grid gap-2 sm:grid-cols-2"
    >
      <Checkbox
        v-for="option in options"
        :key="option.value"
        :checked="isChecked(option.value)"
        :disabled="disabled"
        class="runtime-config-enum-option"
        @update:checked="
          (checked) => toggleOption(option.value, Boolean(checked))
        "
      >
        {{ option.label }}
      </Checkbox>
    </div>
  </RuntimeConfigFieldShell>
</template>

<style scoped>
.runtime-config-enum-option {
  padding: 0.375rem 0.5rem;
  margin-inline-start: 0 !important;
  background: hsl(var(--muted) / 20%);
  border: 1px solid hsl(var(--border) / 45%);
  border-radius: 0.375rem;
}
</style>
