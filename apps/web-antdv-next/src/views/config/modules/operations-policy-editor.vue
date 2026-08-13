<script lang="ts" setup>
import type {
  OperationsPolicy,
  RuntimeFieldDescriptor,
} from '@vben/types/config-api';

import type { PolicyClientValidationIssue } from './policy-schema';

import RuntimeDescriptorEditor from './runtime-descriptor-editor.vue';

defineOptions({ name: 'OperationsPolicyEditor' });

withDefaults(
  defineProps<{
    disabled?: boolean;
    fields: RuntimeFieldDescriptor[];
    issues?: PolicyClientValidationIssue[];
    modelValue: OperationsPolicy;
  }>(),
  { disabled: false, issues: () => [] },
);

defineEmits<{
  'update:modelValue': [value: OperationsPolicy];
}>();

const groupOrder = [
  'outcome_reconciliation',
  'entry_condition',
  'notifications',
  'kill_switch',
];
</script>

<template>
  <RuntimeDescriptorEditor
    :disabled="disabled"
    :fields="fields"
    :group-order="groupOrder"
    :issues="issues"
    :model-value="modelValue"
    resource="operations_policy"
    @update:model-value="$emit('update:modelValue', $event as OperationsPolicy)"
  />
</template>
