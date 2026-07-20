<script lang="ts" setup>
import type {
  PolicyClientValidationIssue,
  PolicyJsonSchema,
} from './policy-schema';

import { computed, useId } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Checkbox,
  Input,
  InputNumber,
  Select,
  Tooltip,
} from 'antdv-next';

import { $t } from '#/locales';

import {
  policyEnumValueLabel,
  policyFieldDescription,
  policyFieldLabel,
  policySchemaType,
  resolvePolicySchema,
} from './policy-schema';

defineOptions({ name: 'PolicyField' });

const props = withDefaults(
  defineProps<{
    depth?: number;
    disabled?: boolean;
    fieldName?: string;
    fieldPath?: string[];
    hiddenFields?: string[];
    issues?: PolicyClientValidationIssue[];
    modelValue: unknown;
    rootSchema: PolicyJsonSchema;
    schema: PolicyJsonSchema;
  }>(),
  {
    depth: 0,
    disabled: false,
    fieldName: '',
    fieldPath: () => [],
    hiddenFields: () => [],
    issues: () => [],
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: unknown];
}>();

const controlId = useId();
const resolved = computed(() =>
  resolvePolicySchema(props.rootSchema, props.schema),
);
const type = computed(() => policySchemaType(resolved.value));
const properties = computed(() =>
  Object.entries(resolved.value.properties ?? {}).filter(
    ([key, schema]) =>
      schema['x-ui-visible'] !== false &&
      !props.hiddenFields.includes([...props.fieldPath, key].join('.')),
  ),
);
const label = computed(() => policyFieldLabel(props.fieldName, resolved.value));
const description = computed(() =>
  policyFieldDescription(props.fieldName, resolved.value),
);
const currentIssues = computed(() =>
  props.issues.filter(
    (issue) =>
      issue.path.length === props.fieldPath.length &&
      issue.path.every((part, index) => part === props.fieldPath[index]),
  ),
);
const enumOptions = computed(() =>
  (resolved.value.enum ?? []).flatMap((value) =>
    typeof value === 'string' || typeof value === 'number' || value === null
      ? [{ label: policyEnumValueLabel(value), value }]
      : [],
  ),
);

const unionVariants = computed(() =>
  (resolved.value.oneOf ?? []).map((schema, index) => {
    const variant = resolvePolicySchema(props.rootSchema, schema);
    const discriminator = Object.entries(variant.properties ?? {}).find(
      ([, property]) => property.const !== undefined,
    );
    return {
      discriminatorKey: discriminator?.[0],
      discriminatorValue: discriminator?.[1].const,
      index,
      label:
        (variant.title ? policyEnumValueLabel(variant.title) : undefined) ??
        (discriminator?.[1].const === undefined
          ? `${$t('page.config.editor.variant')} ${index + 1}`
          : policyEnumValueLabel(discriminator[1].const)),
      schema: variant,
    };
  }),
);
const scalarUnionOptions = computed(() =>
  unionVariants.value.flatMap((variant) => {
    const value = variant.schema.const;
    return typeof value === 'string' || typeof value === 'number'
      ? [{ label: policyEnumValueLabel(value), value }]
      : [];
  }),
);
const isScalarUnion = computed(
  () =>
    unionVariants.value.length > 0 &&
    scalarUnionOptions.value.length === unionVariants.value.length,
);

const selectedUnionIndex = computed(() => {
  const model = props.modelValue;
  if (!isRecord(model)) {
    return unionVariants.value[0]?.index ?? 0;
  }
  return (
    unionVariants.value.find(
      (variant) =>
        variant.discriminatorKey !== undefined &&
        model[variant.discriminatorKey] === variant.discriminatorValue,
    )?.index ??
    unionVariants.value[0]?.index ??
    0
  );
});

const selectedUnionSchema = computed(
  () =>
    unionVariants.value.find(
      (variant) => variant.index === selectedUnionIndex.value,
    )?.schema,
);

function objectValue() {
  return isRecord(props.modelValue) ? props.modelValue : {};
}

function updateProperty(key: string, value: unknown) {
  emit('update:modelValue', { ...objectValue(), [key]: value });
}

function updateBoolean(event: unknown) {
  if (
    typeof event === 'object' &&
    event !== null &&
    'target' in event &&
    typeof event.target === 'object' &&
    event.target !== null &&
    'checked' in event.target
  ) {
    emit('update:modelValue', Boolean(event.target.checked));
  }
}

function switchUnion(index: unknown) {
  if (typeof index !== 'number') {
    return;
  }
  const variant = unionVariants.value.find((item) => item.index === index);
  if (!variant) {
    return;
  }
  emit('update:modelValue', defaultForSchema(variant.schema));
}

function updateArrayItem(index: number, value: unknown) {
  const next = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
  next[index] = value;
  emit('update:modelValue', next);
}

function addArrayItem() {
  const next = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
  next.push(defaultForSchema(resolved.value.items ?? {}));
  emit('update:modelValue', next);
}

function removeArrayItem(index: number) {
  const next = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
  next.splice(index, 1);
  emit('update:modelValue', next);
}

function defaultForSchema(schema: PolicyJsonSchema): unknown {
  const concrete = resolvePolicySchema(props.rootSchema, schema);
  if (concrete.default !== undefined) {
    return structuredClone(concrete.default);
  }
  if (concrete.const !== undefined) {
    return concrete.const;
  }
  if (concrete.oneOf?.length) {
    return defaultForSchema(concrete.oneOf[0] ?? {});
  }
  switch (policySchemaType(concrete)) {
    case 'array': {
      return [];
    }
    case 'boolean': {
      return false;
    }
    case 'integer':
    case 'number': {
      return 0;
    }
    case 'object': {
      return Object.fromEntries(
        Object.entries(concrete.properties ?? {}).map(([key, child]) => [
          key,
          defaultForSchema(child),
        ]),
      );
    }
    case 'string': {
      return concrete.enum?.[0] ?? '';
    }
    default: {
      return null;
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validationMessage(issue: PolicyClientValidationIssue) {
  return $t(`page.config.editor.validation.${issue.code}`, {
    expected: issue.expected ?? '',
  });
}
</script>

<template>
  <div v-if="resolved.oneOf && isScalarUnion" class="policy-field">
    <div class="policy-label-row">
      <label :for="controlId" class="policy-label">{{ label }}</label>
      <Tooltip v-if="description" :title="description">
        <IconifyIcon
          icon="lucide:circle-help"
          class="text-muted-foreground size-3.5"
        />
      </Tooltip>
    </div>
    <Select
      :aria-label="label"
      :disabled="disabled"
      :id="controlId"
      :options="scalarUnionOptions"
      :value="modelValue"
      class="w-full"
      @update:value="$emit('update:modelValue', $event)"
    />
  </div>

  <div v-else-if="resolved.oneOf" class="policy-field">
    <div class="policy-label-row">
      <label :for="controlId" class="policy-label">{{ label }}</label>
      <Tooltip v-if="description" :title="description">
        <IconifyIcon
          icon="lucide:circle-help"
          class="text-muted-foreground size-3.5"
        />
      </Tooltip>
    </div>
    <Select
      :aria-label="label"
      :disabled="disabled"
      :id="controlId"
      :options="
        unionVariants.map((variant) => ({
          label: variant.label,
          value: variant.index,
        }))
      "
      :value="selectedUnionIndex"
      class="w-full"
      @update:value="switchUnion"
    />
    <div v-if="selectedUnionSchema" class="mt-3">
      <PolicyField
        :depth="depth + 1"
        :disabled="disabled"
        :field-path="fieldPath"
        :hidden-fields="hiddenFields"
        :issues="issues"
        :model-value="modelValue"
        :root-schema="rootSchema"
        :schema="selectedUnionSchema"
        @update:model-value="$emit('update:modelValue', $event)"
      />
    </div>
  </div>

  <div
    v-else-if="type === 'object'"
    :class="depth === 0 ? 'policy-section-grid' : 'policy-object-grid'"
  >
    <section
      v-for="([key, childSchema], index) in properties"
      :key="key"
      :class="
        depth === 0 &&
        policySchemaType(resolvePolicySchema(rootSchema, childSchema)) ===
          'object'
          ? 'policy-section'
          : 'policy-object-field'
      "
      :style="{ '--field-index': index }"
    >
      <header
        v-if="
          depth === 0 &&
          policySchemaType(resolvePolicySchema(rootSchema, childSchema)) ===
            'object'
        "
        class="mb-4"
      >
        <h3 class="text-sm font-semibold">
          {{
            policyFieldLabel(key, resolvePolicySchema(rootSchema, childSchema))
          }}
        </h3>
        <p
          v-if="
            policyFieldDescription(
              key,
              resolvePolicySchema(rootSchema, childSchema),
            )
          "
          class="text-muted-foreground mt-1 text-xs leading-5"
        >
          {{
            policyFieldDescription(
              key,
              resolvePolicySchema(rootSchema, childSchema),
            )
          }}
        </p>
      </header>
      <PolicyField
        :depth="depth + 1"
        :disabled="disabled"
        :field-name="key"
        :field-path="[...fieldPath, key]"
        :hidden-fields="hiddenFields"
        :issues="issues"
        :model-value="objectValue()[key]"
        :root-schema="rootSchema"
        :schema="childSchema"
        @update:model-value="updateProperty(key, $event)"
      />
    </section>
  </div>

  <div v-else-if="type === 'array'" class="policy-field">
    <div class="policy-label-row">
      <div>
        <label class="policy-label">{{ label }}</label>
        <p v-if="description" class="policy-description">
          {{ description }}
        </p>
      </div>
      <Button
        :disabled="disabled"
        size="small"
        type="text"
        @click="addArrayItem"
      >
        <IconifyIcon icon="lucide:plus" />
        {{ $t('page.config.editor.addItem') }}
      </Button>
    </div>
    <div
      v-if="Array.isArray(modelValue) && modelValue.length > 0"
      class="grid gap-2"
    >
      <div
        v-for="(item, index) in modelValue"
        :key="index"
        class="rounded-lg border p-3"
      >
        <div class="mb-2 flex items-center justify-between">
          <span class="text-muted-foreground text-xs">
            {{ $t('page.config.editor.item', { index: index + 1 }) }}
          </span>
          <Button
            :aria-label="$t('page.config.editor.removeItem')"
            :disabled="disabled"
            danger
            size="small"
            type="text"
            @click="removeArrayItem(index)"
          >
            <IconifyIcon icon="lucide:trash-2" />
          </Button>
        </div>
        <PolicyField
          :depth="depth + 1"
          :disabled="disabled"
          :field-path="[...fieldPath, String(index)]"
          :hidden-fields="hiddenFields"
          :issues="issues"
          :model-value="item"
          :root-schema="rootSchema"
          :schema="resolved.items ?? {}"
          @update:model-value="updateArrayItem(index, $event)"
        />
      </div>
    </div>
    <p v-else class="policy-empty">{{ $t('page.config.editor.emptyList') }}</p>
  </div>

  <div v-else-if="resolved.enum" class="policy-field">
    <div class="policy-label-row">
      <label :for="controlId" class="policy-label">{{ label }}</label>
      <Tooltip v-if="description" :title="description">
        <IconifyIcon
          icon="lucide:circle-help"
          class="text-muted-foreground size-3.5"
        />
      </Tooltip>
    </div>
    <Select
      :aria-label="label"
      :disabled="disabled"
      :id="controlId"
      :options="enumOptions"
      :value="modelValue"
      class="w-full"
      @update:value="$emit('update:modelValue', $event)"
    />
  </div>

  <div v-else-if="type === 'boolean'" class="policy-field policy-field--check">
    <Checkbox
      :checked="Boolean(modelValue)"
      :disabled="disabled"
      @change="updateBoolean"
    >
      <span class="policy-label">{{ label }}</span>
    </Checkbox>
    <p v-if="description" class="policy-description ml-6">
      {{ description }}
    </p>
  </div>

  <div v-else-if="type === 'integer' || type === 'number'" class="policy-field">
    <div class="policy-label-row">
      <label :for="controlId" class="policy-label">{{ label }}</label>
      <Tooltip v-if="description" :title="description">
        <IconifyIcon
          icon="lucide:circle-help"
          class="text-muted-foreground size-3.5"
        />
      </Tooltip>
    </div>
    <InputNumber
      :aria-label="label"
      :disabled="disabled"
      :id="controlId"
      :max="resolved.maximum"
      :min="resolved.minimum"
      :precision="type === 'integer' ? 0 : undefined"
      :value="typeof modelValue === 'number' ? modelValue : undefined"
      class="w-full"
      @update:value="$emit('update:modelValue', $event)"
    />
    <p v-if="description" class="policy-description">
      {{ description }}
    </p>
  </div>

  <div v-else class="policy-field">
    <div class="policy-label-row">
      <label :for="controlId" class="policy-label">{{ label }}</label>
      <Tooltip v-if="description" :title="description">
        <IconifyIcon
          icon="lucide:circle-help"
          class="text-muted-foreground size-3.5"
        />
      </Tooltip>
    </div>
    <Input
      :aria-label="label"
      :disabled="disabled"
      :id="controlId"
      :value="typeof modelValue === 'string' ? modelValue : ''"
      @update:value="$emit('update:modelValue', $event)"
    />
    <p v-if="description" class="policy-description">
      {{ description }}
    </p>
  </div>

  <ul
    v-if="currentIssues.length > 0"
    :data-field-path="fieldPath.join('.')"
    data-testid="config-inline-error"
    class="policy-validation-errors"
    role="alert"
  >
    <li v-for="issue in currentIssues" :key="issue.code">
      {{ validationMessage(issue) }}
    </li>
  </ul>
</template>

<style scoped>
.policy-section-grid {
  display: grid;
  gap: 0.875rem;
}

.policy-section {
  padding: 1rem;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
}

.policy-object-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.policy-object-field:has(.policy-object-grid),
.policy-object-field:has(.policy-section-grid),
.policy-object-field:has(.policy-field--check),
.policy-object-field:has(.policy-field > .grid) {
  grid-column: 1 / -1;
}

.policy-field {
  min-width: 0;
}

.policy-label-row {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}

.policy-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.policy-description {
  margin-top: 0.35rem;
  font-size: 0.75rem;
  line-height: 1.4;
  color: hsl(var(--muted-foreground));
}

.policy-validation-errors {
  margin-top: 0.35rem;
  font-size: 0.75rem;
  color: hsl(var(--destructive));
}

.policy-empty {
  padding: 1rem;
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  text-align: center;
  border: 1px dashed hsl(var(--border));
  border-radius: 0.5rem;
}

@media (max-width: 768px) {
  .policy-object-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
