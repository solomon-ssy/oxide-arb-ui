<script lang="ts" setup>
import type {
  ModelRouting,
  RuntimeFieldDescriptor,
} from '@vben/types/config-api';

import type { PolicyClientValidationIssue } from './policy-schema';

import RuntimeDescriptorEditor from './runtime-descriptor-editor.vue';

defineOptions({ name: 'ModelRoutingEditor' });

withDefaults(
  defineProps<{
    disabled?: boolean;
    fields: RuntimeFieldDescriptor[];
    issues?: PolicyClientValidationIssue[];
    modelValue: ModelRouting;
  }>(),
  { disabled: false, issues: () => [] },
);

defineEmits<{
  'update:modelValue': [value: ModelRouting];
}>();

const groupOrder = [
  'model/buy_routes',
  'model/portfolio_scenario_model_bindings',
  'model/calibration',
  'model/shadow_diff_threshold',
  'model/active_exit_model_version_id',
];
</script>

<template>
  <RuntimeDescriptorEditor
    :disabled="disabled"
    :fields="fields"
    :group-order="groupOrder"
    :issues="issues"
    :model-value="modelValue"
    resource="model_routing"
    @update:model-value="$emit('update:modelValue', $event as ModelRouting)"
  />
</template>
