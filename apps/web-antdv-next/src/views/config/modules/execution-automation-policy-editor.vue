<script lang="ts" setup>
import type {
  ExecutionAutomationPolicy,
  RuntimeFieldDescriptor,
} from '@vben/types/config-api';

import type { PolicyClientValidationIssue } from './policy-schema';

import RuntimeDescriptorEditor from './runtime-descriptor-editor.vue';

defineOptions({ name: 'ExecutionAutomationPolicyEditor' });

withDefaults(
  defineProps<{
    disabled?: boolean;
    fields: RuntimeFieldDescriptor[];
    issues?: PolicyClientValidationIssue[];
    modelValue: ExecutionAutomationPolicy;
  }>(),
  { disabled: false, issues: () => [] },
);

defineEmits<{
  'update:modelValue': [value: ExecutionAutomationPolicy];
}>();

const groupOrder = ['semi_auto', 'auto_execution'];
</script>

<template>
  <RuntimeDescriptorEditor
    :disabled="disabled"
    :fields="fields"
    :group-order="groupOrder"
    :issues="issues"
    :model-value="modelValue"
    resource="execution_automation_policy"
    @update:model-value="
      $emit('update:modelValue', $event as ExecutionAutomationPolicy)
    "
  />
</template>
