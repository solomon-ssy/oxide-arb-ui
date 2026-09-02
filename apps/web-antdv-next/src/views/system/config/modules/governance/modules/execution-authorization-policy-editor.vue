<script lang="ts" setup>
import type {
  ExecutionAuthorizationPolicy,
  RuntimeFieldDescriptor,
} from '@vben/types/config-api';

import type { PolicyClientValidationIssue } from './policy-schema';

import RuntimeDescriptorEditor from './runtime-descriptor-editor.vue';

defineOptions({ name: 'ExecutionAuthorizationPolicyEditor' });

withDefaults(
  defineProps<{
    disabled?: boolean;
    fields: RuntimeFieldDescriptor[];
    issues?: PolicyClientValidationIssue[];
    modelValue: ExecutionAuthorizationPolicy;
  }>(),
  { disabled: false, issues: () => [] },
);

defineEmits<{
  'update:modelValue': [value: ExecutionAuthorizationPolicy];
}>();

const groupOrder = ['policy_automatic_limits'];
</script>

<template>
  <RuntimeDescriptorEditor
    :disabled="disabled"
    :fields="fields"
    :group-order="groupOrder"
    :issues="issues"
    :model-value="modelValue"
    resource="execution_authorization_policy"
    @update:model-value="
      $emit('update:modelValue', $event as ExecutionAuthorizationPolicy)
    "
  />
</template>
