<script lang="ts" setup>
import type {
  RecommendationPolicy,
  RuntimeFieldDescriptor,
} from '@vben/types/config-api';

import type { PolicyClientValidationIssue } from './policy-schema';

import RuntimeDescriptorEditor from './runtime-descriptor-editor.vue';

defineOptions({ name: 'RecommendationPolicyEditor' });

withDefaults(
  defineProps<{
    disabled?: boolean;
    fields: RuntimeFieldDescriptor[];
    issues?: PolicyClientValidationIssue[];
    modelValue: RecommendationPolicy;
  }>(),
  { disabled: false, issues: () => [] },
);

defineEmits<{
  'update:modelValue': [value: RecommendationPolicy];
}>();

const groupOrder = ['selection', 'data_quality', 'reports'];
</script>

<template>
  <RuntimeDescriptorEditor
    :disabled="disabled"
    :fields="fields"
    :group-order="groupOrder"
    :issues="issues"
    :model-value="modelValue"
    resource="recommendation_policy"
    @update:model-value="
      $emit('update:modelValue', $event as RecommendationPolicy)
    "
  />
</template>
