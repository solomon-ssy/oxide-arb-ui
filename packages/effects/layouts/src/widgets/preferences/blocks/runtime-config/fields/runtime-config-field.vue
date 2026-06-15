<script setup lang="ts">
import type { RuntimeConfigSchemaFieldView } from '@vben/types';

import { computed } from 'vue';

import { $t } from '@vben/locales';
import { preferences } from '@vben/preferences';

import InputItem from '../../input-item.vue';
import NumberFieldItem from '../../number-field-item.vue';
import SelectItem from '../../select-item.vue';
import SwitchItem from '../../switch-item.vue';
import { schemaEnumValues } from '../schema-mapper';
import { resolveUiText } from '../ui-text';
import { resolveWidget } from '../widget-registry';
import RuntimeConfigEnumDecimalMapField from './runtime-config-enum-decimal-map-field.vue';
import RuntimeConfigEnumSetField from './runtime-config-enum-set-field.vue';
import RuntimeConfigFieldHelp from './runtime-config-field-help.vue';
import RuntimeConfigJsonLeafEditor from './runtime-config-json-leaf-editor.vue';
import RuntimeConfigStringListField from './runtime-config-string-list-field.vue';

const props = defineProps<{
  disabled?: boolean;
  field: RuntimeConfigSchemaFieldView;
}>();

const model = defineModel<unknown>({ required: true });

const locale = computed(() => preferences.app.locale);
const label = computed(() => resolveUiText(props.field.label, locale.value));
const helper = computed(() => resolveUiText(props.field.help, locale.value));
const widget = computed(() => resolveWidget(props.field));

const enumOptions = computed(() =>
  (props.field.enum_items ?? []).map((item) => ({
    label: resolveUiText(item.label, locale.value),
    value: String(item.key),
  })).length > 0
    ? (props.field.enum_items ?? []).map((item) => ({
        label: resolveUiText(item.label, locale.value),
        value: String(item.key),
      }))
    : schemaEnumValues(props.field).map((value) => ({
        label: value,
        value,
      })),
);

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
  set: (value: number) => {
    model.value = value;
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

  <RuntimeConfigEnumDecimalMapField
    v-else-if="widget === 'enum_decimal_map'"
    v-model="enumDecimalMapModel"
    :disabled="disabled"
    :field="field"
    :label="label"
    :locale="locale"
  />

  <div v-else-if="widget === 'json_tree'" class="my-1 px-2 py-1">
    <div class="mb-2 flex flex-wrap items-center gap-2 text-sm">
      <span class="text-foreground min-w-0 font-medium break-words">
        {{ label }}
      </span>
      <RuntimeConfigFieldHelp :help="field.help" :locale="locale" />
    </div>
    <p class="text-muted-foreground mb-2 text-xs">
      {{ $t('preferences.runtimeConfig.field.genericJsonHint') }}
    </p>
    <RuntimeConfigJsonLeafEditor v-model="model" :disabled="disabled" />
  </div>

  <SwitchItem
    v-else-if="widget === 'boolean'"
    v-model="booleanModel"
    :disabled="disabled"
    :tip="helper"
    class="px-0"
  >
    <span class="flex min-w-0 flex-wrap items-center gap-2">
      <span class="break-words">{{ label }}</span>
      <span
        v-if="field.money_critical"
        class="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-600"
      >
        {{ $t('preferences.runtimeConfig.state.moneyCriticalShort') }}
      </span>
    </span>
  </SwitchItem>

  <SelectItem
    v-else-if="widget === 'enum_select'"
    v-model="stringModel"
    :disabled="disabled"
    :items="enumOptions"
    :tip="helper"
    class="px-0"
  >
    <span class="flex min-w-0 flex-wrap items-center gap-2">
      <span class="break-words">{{ label }}</span>
    </span>
  </SelectItem>

  <NumberFieldItem
    v-else-if="widget === 'integer' || widget === 'duration_ms'"
    v-model="numberModel"
    :disabled="disabled"
    :max="field.constraints?.maximum"
    :min="field.constraints?.minimum"
    :tip="helper"
    class="px-0"
  >
    <span class="flex min-w-0 flex-wrap items-center gap-2">
      <span class="break-words">{{ label }}</span>
    </span>
  </NumberFieldItem>

  <InputItem
    v-else
    v-model="stringModel"
    :disabled="disabled"
    :placeholder="field.sensitive ? 'leave blank to keep current' : ''"
    :sensitive="field.sensitive"
    :tip="helper"
    class="px-0"
  >
    <span class="flex min-w-0 flex-wrap items-center gap-2">
      <span class="break-words">{{ label }}</span>
      <span
        v-if="field.sensitive"
        class="shrink-0 rounded bg-purple-500/10 px-1.5 py-0.5 text-xs text-purple-600"
      >
        {{ $t('preferences.runtimeConfig.state.sensitive') }}
      </span>
      <span
        v-if="field.money_critical"
        class="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-600"
      >
        {{ $t('preferences.runtimeConfig.state.moneyCriticalShort') }}
      </span>
    </span>
  </InputItem>
</template>
