<script setup lang="ts">
import type { RuntimeConfigSchemaFieldView } from '@vben/types';

import { computed } from 'vue';

import { preferences } from '@vben/preferences';

import { Input, Select, Switch } from 'antdv-next';

import { $t } from '#/locales';
import InputNumberWithAddon from '#/shared/components/input-number-with-addon.vue';

import { schemaEnumValues } from '../schema-mapper';
import { resolveUiText } from '../ui-text';
import { resolveWidget } from '../widget-registry';
import RuntimeConfigEnumDecimalMapField from './runtime-config-enum-decimal-map-field.vue';
import RuntimeConfigEnumSetField from './runtime-config-enum-set-field.vue';
import RuntimeConfigFieldShell from './runtime-config-field-shell.vue';
import RuntimeConfigJsonLeafEditor from './runtime-config-json-leaf-editor.vue';
import RuntimeConfigModelVersionSelectField from './runtime-config-model-version-select-field.vue';
import RuntimeConfigRatioSliderField from './runtime-config-ratio-slider-field.vue';
import RuntimeConfigStringListField from './runtime-config-string-list-field.vue';
import RuntimeConfigWeightMapField from './runtime-config-weight-map-field.vue';

const props = defineProps<{
  disabled?: boolean;
  field: RuntimeConfigSchemaFieldView;
}>();

const model = defineModel<unknown>({ required: true });

const locale = computed(() => preferences.app.locale);
const label = computed(() => resolveUiText(props.field.label, locale.value));
const widget = computed(() => resolveWidget(props.field));
const critical = computed(
  () => props.field.semantics === 'governance_critical',
);

const uiProps = computed(() => props.field.ui_props ?? {});
const readOnly = computed(() => uiProps.value.read_only === true);
const controlDisabled = computed(() => props.disabled || readOnly.value);
const placeholder = computed(() =>
  uiProps.value.placeholder
    ? resolveUiText(uiProps.value.placeholder, locale.value)
    : undefined,
);

const enumOptions = computed(() => {
  const items = (props.field.enum_items ?? []).map((item) => ({
    label: resolveUiText(item.label, locale.value),
    value: String(item.key),
  }));
  return items.length > 0
    ? items
    : schemaEnumValues(props.field).map((value) => ({ label: value, value }));
});

const stringModel = computed({
  get: () => String(model.value ?? ''),
  set: (value: string) => {
    model.value = value;
  },
});

const numberModel = computed({
  get: () => {
    const value = Number(model.value);
    return Number.isFinite(value) ? value : 0;
  },
  set: (value: null | number) => {
    model.value = value ?? 0;
  },
});

const booleanModel = computed({
  get: () => Boolean(model.value),
  set: (value: boolean) => {
    model.value = value;
  },
});

const enumArrayModel = computed({
  get: () => (Array.isArray(model.value) ? model.value.map(String) : []),
  set: (value: string[]) => {
    model.value = value;
  },
});

const stringArrayModel = computed({
  get: () => (Array.isArray(model.value) ? model.value.map(String) : []),
  set: (value: string[]) => {
    model.value = value;
  },
});

const enumDecimalMapModel = computed({
  get: () =>
    model.value &&
    typeof model.value === 'object' &&
    !Array.isArray(model.value)
      ? (model.value as Record<string, string>)
      : {},
  set: (value: Record<string, string>) => {
    model.value = value;
  },
});
</script>

<template>
  <RuntimeConfigEnumSetField
    v-if="widget === 'enum_set'"
    v-model="enumArrayModel"
    :disabled="disabled"
    :field="field"
    :label="label"
    :locale="locale"
  />

  <RuntimeConfigStringListField
    v-else-if="widget === 'string_list'"
    v-model="stringArrayModel"
    :disabled="disabled"
    :field="field"
    :label="label"
    :locale="locale"
  />

  <RuntimeConfigWeightMapField
    v-else-if="widget === 'weight_map'"
    v-model="enumDecimalMapModel"
    :disabled="disabled"
    :field="field"
    :label="label"
    :locale="locale"
  />

  <RuntimeConfigEnumDecimalMapField
    v-else-if="widget === 'enum_decimal_map' || widget === 'decimal_map'"
    v-model="enumDecimalMapModel"
    :disabled="disabled"
    :field="field"
    :label="label"
    :locale="locale"
  />

  <RuntimeConfigRatioSliderField
    v-else-if="widget === 'ratio_slider'"
    v-model="stringModel"
    :disabled="disabled"
    :field="field"
    :label="label"
    :locale="locale"
  />

  <RuntimeConfigModelVersionSelectField
    v-else-if="widget === 'model_version_select'"
    v-model="stringModel"
    :disabled="disabled"
    :field="field"
    :label="label"
    :locale="locale"
  />

  <RuntimeConfigFieldShell
    v-else-if="widget === 'json_tree'"
    :field="field"
    :label="label"
    :locale="locale"
  >
    <p class="text-muted-foreground mb-2 text-xs">
      {{ $t('page.runtimeConfig.editor.field.genericJsonHint') }}
    </p>
    <RuntimeConfigJsonLeafEditor
      v-model="model"
      :disabled="disabled"
      :field="field"
    />
  </RuntimeConfigFieldShell>

  <RuntimeConfigFieldShell
    v-else
    :critical="critical"
    :field="field"
    :label="label"
    :locale="locale"
    :sensitive="field.sensitive"
  >
    <Switch
      v-if="widget === 'boolean'"
      v-model:checked="booleanModel"
      :disabled="controlDisabled"
    />

    <Select
      v-else-if="widget === 'enum_select'"
      v-model:value="stringModel"
      :disabled="controlDisabled"
      :options="enumOptions"
      class="w-full"
    />

    <InputNumberWithAddon
      v-else-if="widget === 'integer' || widget === 'duration_ms'"
      v-model="numberModel"
      :addon-after="uiProps.suffix"
      :addon-before="uiProps.prefix"
      :disabled="controlDisabled"
      :max="field.constraints?.maximum"
      :min="field.constraints?.minimum"
      :placeholder="placeholder"
    />

    <Input
      v-else-if="widget === 'secret_string'"
      v-model:value="stringModel"
      :disabled="controlDisabled"
      :placeholder="
        placeholder ?? $t('page.runtimeConfig.editor.field.secretPlaceholder')
      "
      type="password"
    />

    <Input
      v-else-if="widget === 'decimal_string'"
      v-model:value="stringModel"
      :addon-after="uiProps.suffix"
      :addon-before="uiProps.prefix"
      input-mode="decimal"
      :placeholder="placeholder"
      :readonly="readOnly"
      :disabled="controlDisabled"
    />

    <Input
      v-else
      v-model:value="stringModel"
      :addon-after="uiProps.suffix"
      :addon-before="uiProps.prefix"
      :placeholder="placeholder"
      :readonly="readOnly"
      :disabled="controlDisabled"
    />
  </RuntimeConfigFieldShell>
</template>
