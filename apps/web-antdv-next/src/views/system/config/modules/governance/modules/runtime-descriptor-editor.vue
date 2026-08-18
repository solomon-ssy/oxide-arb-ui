<script lang="ts" setup>
import type {
  ConfigResourceKind,
  RuntimeFieldDescriptor,
} from '@vben/types/config-api';

import type { PolicyClientValidationIssue } from './policy-schema';

import { computed, toRaw } from 'vue';

import { Checkbox, Input, InputNumber, Select, Tag, Tooltip } from 'antdv-next';

import { $t } from '#/locales';

import CapitalTimeBucketsControl from './capital-time-buckets-control.vue';
import {
  policyEnumValueLabel,
  runtimeFieldDescription,
  runtimeFieldLabel,
  runtimeGroupLabel,
} from './policy-schema';
import ReportScheduleListControl from './report-schedule-list-control.vue';

defineOptions({ name: 'RuntimeDescriptorEditor' });

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    fields: RuntimeFieldDescriptor[];
    groupOrder: string[];
    issues?: PolicyClientValidationIssue[];
    modelValue: object;
    resource: ConfigResourceKind;
  }>(),
  { disabled: false, issues: () => [] },
);

const emit = defineEmits<{
  'update:modelValue': [value: object];
}>();

const visibleFields = computed(() =>
  props.fields
    .filter((field) => isVisible(field))
    .toSorted((left, right) => left.order - right.order),
);

const groups = computed(() => {
  const byGroup = new Map<string, RuntimeFieldDescriptor[]>();
  for (const field of visibleFields.value) {
    const group = byGroup.get(field.group) ?? [];
    group.push(field);
    byGroup.set(field.group, group);
  }
  const declared = new Set(props.groupOrder);
  const unknown = [...byGroup.keys()].filter((name) => !declared.has(name));
  if (unknown.length > 0) {
    throw new Error(
      `${props.resource} descriptors contain undeclared editor groups: ${unknown.join(', ')}`,
    );
  }
  return props.groupOrder.flatMap((name) => {
    const fields = byGroup.get(name);
    return fields && fields.length > 0 ? [{ fields, name }] : [];
  });
});

function pointerSegments(pointer: string) {
  return pointer
    .split('/')
    .slice(1)
    .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'));
}

function pointerValue(pointer: string): unknown {
  let current: unknown = props.modelValue;
  for (const segment of pointerSegments(pointer)) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function updatePointer(pointer: string, value: unknown) {
  const next = structuredClone(toRaw(props.modelValue)) as Record<
    string,
    unknown
  >;
  const segments = pointerSegments(pointer);
  const finalSegment = segments.pop();
  if (!finalSegment) return;
  let current: Record<string, unknown> = next;
  for (const segment of segments) {
    const child = current[segment];
    if (typeof child !== 'object' || child === null || Array.isArray(child)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }
  current[finalSegment] = value;
  emit('update:modelValue', next);
}

function isVisible(field: RuntimeFieldDescriptor) {
  const condition = field.visibility_condition;
  return condition === null || condition === undefined
    ? true
    : Object.is(pointerValue(condition.pointer), condition.equals);
}

function isDisabled(field: RuntimeFieldDescriptor) {
  return props.disabled || field.read_only;
}

function numberValue(field: RuntimeFieldDescriptor) {
  const value = pointerValue(field.pointer);
  return typeof value === 'number' ? value : undefined;
}

function stringValue(field: RuntimeFieldDescriptor) {
  const value = pointerValue(field.pointer);
  return typeof value === 'string' ? value : '';
}

function arrayValue(field: RuntimeFieldDescriptor) {
  const value = pointerValue(field.pointer);
  return Array.isArray(value) ? value : [];
}

function updateBoolean(field: RuntimeFieldDescriptor, event: unknown) {
  if (
    typeof event === 'object' &&
    event !== null &&
    'target' in event &&
    typeof event.target === 'object' &&
    event.target !== null &&
    'checked' in event.target
  ) {
    updatePointer(field.pointer, Boolean(event.target.checked));
  }
}

function numericBound(value?: null | string) {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function updateNumber(field: RuntimeFieldDescriptor, value: unknown) {
  if (value === null || (typeof value === 'number' && Number.isFinite(value))) {
    updatePointer(field.pointer, value);
  }
}

function fieldIssues(field: RuntimeFieldDescriptor) {
  const path = pointerSegments(field.pointer);
  return props.issues.filter(
    (issue) =>
      issue.path.length === path.length &&
      issue.path.every((part, index) => part === path[index]),
  );
}

function fieldId(field: RuntimeFieldDescriptor) {
  return `runtime-${props.resource}-${field.pointer.replaceAll(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function fieldLabel(field: RuntimeFieldDescriptor) {
  return runtimeFieldLabel(props.resource, field.pointer, field.title);
}

function fieldDescription(field: RuntimeFieldDescriptor) {
  return runtimeFieldDescription(
    props.resource,
    field.pointer,
    field.description,
  );
}

function serializedValue(field: RuntimeFieldDescriptor) {
  const value = pointerValue(field.pointer);
  return value === undefined ? '—' : JSON.stringify(value, null, 2);
}

function validationMessage(issue: PolicyClientValidationIssue) {
  return $t(`page.config.editor.validation.${issue.code}`, {
    expected: issue.expected ?? '',
  });
}

function riskColor(risk: RuntimeFieldDescriptor['risk_level']) {
  switch (risk) {
    case 'critical': {
      return 'error';
    }
    case 'high': {
      return 'warning';
    }
    case 'low': {
      return 'default';
    }
    case 'medium': {
      return 'processing';
    }
  }
}
</script>

<template>
  <div class="runtime-editor" :data-config-resource="resource">
    <section
      v-for="group in groups"
      :key="group.name"
      class="runtime-group bg-card rounded-xl border p-4"
      :data-config-group="group.name"
    >
      <header class="mb-4">
        <h3 class="text-sm font-semibold">
          {{ runtimeGroupLabel(resource, group.name) }}
        </h3>
        <p class="text-muted-foreground mt-1 font-mono text-xs">
          /{{ group.name }}
        </p>
      </header>

      <div class="runtime-field-grid">
        <div
          v-for="field in group.fields"
          :key="field.pointer"
          class="runtime-field"
          :class="{
            'runtime-field--wide': [
              'artifact_mapping',
              'capital_time_buckets',
              'schedule_list',
            ].includes(field.control),
          }"
          :data-config-pointer="field.pointer"
          :data-field-path="pointerSegments(field.pointer).join('.')"
        >
          <div class="runtime-label-row">
            <div class="min-w-0">
              <label :for="fieldId(field)" class="runtime-label">
                {{ fieldLabel(field) }}
                <span
                  v-if="field.required"
                  aria-hidden="true"
                  class="required-mark"
                >
                  *
                </span>
              </label>
              <p
                class="text-muted-foreground mt-0.5 break-all font-mono text-[11px]"
              >
                {{ field.pointer }}
              </p>
            </div>
            <div class="flex shrink-0 flex-wrap justify-end gap-1">
              <Tag :color="riskColor(field.risk_level)">
                {{ $t(`page.config.riskLevel.${field.risk_level}`) }}
              </Tag>
              <Tooltip
                :title="$t(`page.config.boundary.${field.apply_effect}`)"
              >
                <Tag>{{ $t('page.config.editor.applyEffect') }}</Tag>
              </Tooltip>
            </div>
          </div>

          <Checkbox
            v-if="field.control === 'toggle'"
            :aria-describedby="`${fieldId(field)}-description`"
            :checked="Boolean(pointerValue(field.pointer))"
            :disabled="isDisabled(field)"
            :id="fieldId(field)"
            @change="updateBoolean(field, $event)"
          >
            {{ fieldLabel(field) }}
          </Checkbox>

          <InputNumber
            v-else-if="
              field.control === 'integer' || field.control === 'duration'
            "
            :aria-describedby="`${fieldId(field)}-description`"
            :disabled="isDisabled(field)"
            :id="fieldId(field)"
            :max="numericBound(field.bounds.maximum)"
            :min="numericBound(field.bounds.minimum)"
            :precision="0"
            :value="numberValue(field)"
            class="w-full"
            @update:value="updateNumber(field, $event)"
          />

          <Select
            v-else-if="
              field.control === 'select' ||
              (field.control === 'variant' && field.enum_values.length > 0)
            "
            :aria-describedby="`${fieldId(field)}-description`"
            :disabled="isDisabled(field)"
            :id="fieldId(field)"
            :options="
              field.enum_values.map((value) => ({
                label: policyEnumValueLabel(value),
                value,
              }))
            "
            :value="pointerValue(field.pointer)"
            class="w-full"
            @update:value="updatePointer(field.pointer, $event)"
          />

          <Select
            v-else-if="field.control === 'multi_select'"
            :aria-describedby="`${fieldId(field)}-description`"
            :disabled="isDisabled(field)"
            :id="fieldId(field)"
            :mode="field.enum_values.length > 0 ? 'multiple' : 'tags'"
            :options="
              field.enum_values.map((value) => ({
                label: policyEnumValueLabel(value),
                value,
              }))
            "
            :value="arrayValue(field)"
            class="w-full"
            @update:value="
              Array.isArray($event) && updatePointer(field.pointer, $event)
            "
          />

          <ReportScheduleListControl
            v-else-if="field.control === 'schedule_list'"
            :disabled="isDisabled(field)"
            :model-value="pointerValue(field.pointer)"
            @update:model-value="updatePointer(field.pointer, $event)"
          />

          <CapitalTimeBucketsControl
            v-else-if="field.control === 'capital_time_buckets'"
            :disabled="isDisabled(field)"
            :model-value="pointerValue(field.pointer)"
            @update:model-value="updatePointer(field.pointer, $event)"
          />

          <pre
            v-else-if="field.control === 'artifact_mapping'"
            :id="fieldId(field)"
            class="structured-value"
            tabindex="0"
          >
            {{ serializedValue(field) }}
          </pre>

          <Input
            v-else
            :aria-describedby="`${fieldId(field)}-description`"
            :disabled="isDisabled(field)"
            :id="fieldId(field)"
            :inputmode="
              ['decimal', 'money', 'probability'].includes(field.control)
                ? 'decimal'
                : undefined
            "
            :value="stringValue(field)"
            @update:value="updatePointer(field.pointer, $event)"
          />

          <p
            v-if="fieldDescription(field)"
            :id="`${fieldId(field)}-description`"
            class="runtime-description"
          >
            {{ fieldDescription(field) }}
          </p>

          <p v-if="field.unit" class="runtime-description">
            {{ $t('page.config.editor.unit') }}:
            {{ $t(`page.config.unit.${field.unit}`) }}
          </p>
          <p
            v-if="field.read_only"
            class="runtime-description"
            :aria-label="$t('page.config.editor.access')"
          >
            {{ $t('page.config.editor.readOnlyField') }}
          </p>

          <div
            v-if="fieldIssues(field).length > 0"
            data-testid="config-inline-error"
            class="runtime-errors"
            role="alert"
          >
            <ul>
              <li v-for="issue in fieldIssues(field)" :key="issue.code">
                {{ validationMessage(issue) }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.runtime-editor {
  display: grid;
  gap: 0.875rem;
}

.runtime-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 1.5rem;
}

.runtime-field {
  min-width: 0;
}

.runtime-field--wide {
  grid-column: 1 / -1;
  padding-top: 4px;
  border-top: 1px solid hsl(var(--qp-border-subtle));
}

.runtime-label-row {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.55rem;
}

.runtime-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.required-mark {
  margin-left: 0.2rem;
  color: hsl(var(--destructive));
}

.runtime-description {
  margin-top: 0.45rem;
  font-size: 0.75rem;
  line-height: 1.45;
  color: hsl(var(--qp-text-muted));
}

.structured-value {
  max-height: 18rem;
  padding: 0.75rem;
  overflow: auto;
  font-size: 0.6875rem;
  line-height: 1.5;
  white-space: pre-wrap;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
}

.runtime-errors {
  margin-top: 0.45rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: hsl(var(--foreground));
}

@media (max-width: 768px) {
  .runtime-field-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .runtime-label-row {
    flex-direction: column;
  }
}
</style>
