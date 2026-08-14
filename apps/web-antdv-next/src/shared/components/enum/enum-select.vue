<script lang="ts" setup>
import type { SelectProps } from 'antdv-next';

import type { VNode } from 'vue';

import type { EnumOption } from '#/shared/presentation/enum-options';

import { computed, h, useAttrs } from 'vue';

import { Select } from 'antdv-next';

defineOptions({ name: 'EnumSelect', inheritAttrs: false });

const props = defineProps<{
  options?: EnumOption[];
  value?: SelectProps['value'];
}>();

const emit = defineEmits<{
  'update:value': [value: SelectProps['value']];
}>();

const attrs = useAttrs();
const model = computed({
  get: () => props.value,
  set: (value) => emit('update:value', value),
});

function optionNode(option: EnumOption): VNode {
  return h('span', { class: 'enum-select-option' }, [
    h('span', {
      'aria-hidden': 'true',
      class: 'enum-select-swatch',
      style: { backgroundColor: option.swatch },
    }),
    h('span', option.label),
  ]);
}

function renderOption({
  option,
}: Parameters<NonNullable<SelectProps['optionRender']>>[0]) {
  return optionNode(option.data as EnumOption);
}

function renderLabel({ value }: { value: unknown }) {
  const option = props.options?.find((candidate) => candidate.value === value);
  return option ? optionNode(option) : String(value ?? '');
}
</script>

<template>
  <Select
    v-bind="attrs"
    v-model:value="model"
    :label-render="renderLabel"
    :option-render="renderOption"
    :options="options"
  />
</template>

<style scoped>
.enum-select-option {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.enum-select-swatch {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border: 1px solid hsl(var(--qp-surface-base) / 70%);
  border-radius: 999px;
  box-shadow: var(--qp-shadow-swatch);
}
</style>
