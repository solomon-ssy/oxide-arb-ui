<script setup lang="ts">
import type { RuntimeConfigSchemaFieldView } from '@vben/types';

import { computed, onMounted, watch } from 'vue';

import { Alert, Select } from 'antdv-next';

import { $t } from '#/locales';

import RuntimeConfigFieldShell from './runtime-config-field-shell.vue';
import { useModelVersionOptions } from './use-model-version-options';

const props = defineProps<{
  disabled?: boolean;
  field: RuntimeConfigSchemaFieldView;
  label: string;
  locale: string;
}>();

const model = defineModel<string>({ required: true });

const { loading, options, reload } = useModelVersionOptions();

const picker = computed(() => props.field.model_picker);

function load(): void {
  const side = picker.value?.side ?? 'buy';
  void reload(picker.value?.category, side);
}

onMounted(load);
watch(() => [picker.value?.category, picker.value?.side], load);

const selectOptions = computed(() => {
  const known = options.value.map((option) => ({
    label: option.label,
    value: option.value,
  }));
  const current = model.value;
  const isOrphan =
    current !== '' && !known.some((option) => option.value === current);
  return [
    {
      label: $t('page.runtimeConfig.editor.field.modelVersionEmptyOption'),
      value: '',
    },
    ...(isOrphan ? [{ label: current, value: current }] : []),
    ...known,
  ];
});

/** The selected version's declared scope, resolved against the currently
 * loaded catalog (absent when the value is empty or not yet in the loaded
 * page — e.g. a stale/typed-in id no longer `Published`). */
const selectedScope = computed(
  () =>
    options.value.find((option) => option.value === model.value)?.categoryScope,
);

/** A mismatch is only knowable once the catalog has loaded the selected
 * option; an id absent from the loaded catalog is flagged by its own
 * "not eligible" state, not this warning. */
const scopeMismatch = computed(() => {
  const category = picker.value?.category;
  if (!category || !model.value) {
    return false;
  }
  const match = options.value.find((option) => option.value === model.value);
  return (
    match !== undefined &&
    match.categoryScope !== null &&
    match.categoryScope !== category
  );
});

const scopeLabel = computed(() =>
  selectedScope.value
    ? $t(`enum.marketCategory.${selectedScope.value}`)
    : $t('page.runtimeConfig.editor.field.modelVersionScopeGeneric'),
);
</script>

<template>
  <RuntimeConfigFieldShell :field="field" :label="label" :locale="locale">
    <Select
      v-model:value="model"
      class="w-full"
      :disabled="disabled"
      :loading="loading"
      option-filter-prop="label"
      :options="selectOptions"
      :placeholder="
        $t('page.runtimeConfig.editor.field.modelVersionPlaceholder')
      "
      show-search
    />
    <Alert
      v-if="scopeMismatch"
      class="mt-2"
      :message="
        $t('page.runtimeConfig.editor.field.modelVersionScopeWarning', {
          scope: scopeLabel,
        })
      "
      show-icon
      type="warning"
    />
  </RuntimeConfigFieldShell>
</template>
