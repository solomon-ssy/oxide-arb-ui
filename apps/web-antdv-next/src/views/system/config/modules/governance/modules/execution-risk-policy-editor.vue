<script lang="ts" setup>
import type {
  ExecutionRiskPolicy,
  RuntimeFieldDescriptor,
} from '@vben/types/config-api';

import type { PolicyClientValidationIssue } from './policy-schema';

import RuntimeDescriptorEditor from './runtime-descriptor-editor.vue';

defineOptions({ name: 'ExecutionRiskPolicyEditor' });

withDefaults(
  defineProps<{
    disabled?: boolean;
    fields: RuntimeFieldDescriptor[];
    issues?: PolicyClientValidationIssue[];
    modelValue: ExecutionRiskPolicy;
  }>(),
  { disabled: false, issues: () => [] },
);

defineEmits<{
  'update:modelValue': [value: ExecutionRiskPolicy];
}>();

const groupOrder = [
  'portfolio/budget',
  'portfolio/admission',
  'portfolio/exposure_limits',
  'portfolio/tail_risk',
  'entry_order_policy',
  'reconciliation',
  'exit_monitor',
  'breaker',
];
</script>

<template>
  <RuntimeDescriptorEditor
    :disabled="disabled"
    :fields="fields"
    :group-order="groupOrder"
    :issues="issues"
    :model-value="modelValue"
    resource="execution_risk_policy"
    @update:model-value="
      $emit('update:modelValue', $event as ExecutionRiskPolicy)
    "
  />
</template>
