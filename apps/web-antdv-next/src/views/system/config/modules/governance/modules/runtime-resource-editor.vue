<script lang="ts" setup>
import type {
  ConfigResourceKind,
  ExecutionAutomationPolicy,
  ExecutionRiskPolicy,
  ModelRouting,
  OperationsPolicy,
  PolicyDocument,
  RecommendationPolicy,
  ReportSchedule,
  RuntimeFieldDescriptor,
} from '@vben/types/config-api';

import type { PolicyClientValidationIssue } from './policy-schema';

import { computed } from 'vue';

import ExecutionAutomationPolicyEditor from './execution-automation-policy-editor.vue';
import ExecutionRiskPolicyEditor from './execution-risk-policy-editor.vue';
import ModelRoutingEditor from './model-routing-editor.vue';
import OperationsPolicyEditor from './operations-policy-editor.vue';
import RecommendationPolicyEditor from './recommendation-policy-editor.vue';
import ReportScheduleEditor from './report-schedule-editor.vue';

defineOptions({ name: 'RuntimeResourceEditor' });

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    fields: RuntimeFieldDescriptor[];
    issues?: PolicyClientValidationIssue[];
    modelValue: RuntimeDocument;
    resource: ConfigResourceKind;
  }>(),
  { disabled: false, issues: () => [] },
);

const emit = defineEmits<{
  'update:modelValue': [value: RuntimeDocument];
}>();

type RuntimeDocument = PolicyDocument['document'];

const recommendation = computed(() => props.modelValue as RecommendationPolicy);
const executionRisk = computed(() => props.modelValue as ExecutionRiskPolicy);
const modelRouting = computed(() => props.modelValue as ModelRouting);
const reportSchedule = computed(() => props.modelValue as ReportSchedule);
const operations = computed(() => props.modelValue as OperationsPolicy);
const executionAutomation = computed(
  () => props.modelValue as ExecutionAutomationPolicy,
);
</script>

<template>
  <RecommendationPolicyEditor
    v-if="resource === 'recommendation_policy'"
    :disabled="disabled"
    :fields="fields"
    :issues="issues"
    :model-value="recommendation"
    @update:model-value="emit('update:modelValue', $event)"
  />
  <ExecutionRiskPolicyEditor
    v-else-if="resource === 'execution_risk_policy'"
    :disabled="disabled"
    :fields="fields"
    :issues="issues"
    :model-value="executionRisk"
    @update:model-value="emit('update:modelValue', $event)"
  />
  <ModelRoutingEditor
    v-else-if="resource === 'model_routing'"
    :disabled="disabled"
    :fields="fields"
    :issues="issues"
    :model-value="modelRouting"
    @update:model-value="emit('update:modelValue', $event)"
  />
  <ReportScheduleEditor
    v-else-if="resource === 'report_schedule'"
    :disabled="disabled"
    :fields="fields"
    :issues="issues"
    :model-value="reportSchedule"
    @update:model-value="emit('update:modelValue', $event)"
  />
  <OperationsPolicyEditor
    v-else-if="resource === 'operations_policy'"
    :disabled="disabled"
    :fields="fields"
    :issues="issues"
    :model-value="operations"
    @update:model-value="emit('update:modelValue', $event)"
  />
  <ExecutionAutomationPolicyEditor
    v-else-if="resource === 'execution_automation_policy'"
    :disabled="disabled"
    :fields="fields"
    :issues="issues"
    :model-value="executionAutomation"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
