<script lang="ts" setup>
import type { TradePolicyConditionTemplateNodeV1 } from '@vben/types';

import { computed } from 'vue';

import { Button, Card, Input, InputNumber, Select, Space } from 'antdv-next';

import { $t } from '#/locales';

defineOptions({ name: 'ConditionTemplateNodeEditor' });

const props = withDefaults(
  defineProps<{
    depth?: number;
    factorOptions: FactorOption[];
    modelValue: TradePolicyConditionTemplateNodeV1;
  }>(),
  { depth: 1 },
);

const emit = defineEmits<{
  'update:modelValue': [value: TradePolicyConditionTemplateNodeV1];
}>();

interface FactorOption {
  definitionHash: string;
  label: string;
  value: string;
}

const kindOptions = computed(() => [
  {
    label: $t('page.research.tradePolicies.workbench.node.price'),
    value: 'price',
  },
  {
    label: $t('page.research.tradePolicies.workbench.node.clock'),
    value: 'clock',
  },
  {
    label: $t('page.research.tradePolicies.workbench.node.factor'),
    value: 'factor',
  },
  {
    label: $t('page.research.tradePolicies.workbench.node.marketEvent'),
    value: 'market_event',
  },
  { label: $t('page.research.tradePolicies.workbench.node.all'), value: 'all' },
  { label: $t('page.research.tradePolicies.workbench.node.any'), value: 'any' },
]);

const comparisonOptions = computed(() => [
  { label: '≥', value: 'at_or_above' },
  { label: '≤', value: 'at_or_below' },
]);

const anchorOptions = computed(() => [
  {
    label: $t('page.research.tradePolicies.workbench.anchor.decision'),
    value: 'recommendation_decision',
  },
  {
    label: $t('page.research.tradePolicies.workbench.anchor.marketStart'),
    value: 'market_start',
  },
  {
    label: $t('page.research.tradePolicies.workbench.anchor.marketEnd'),
    value: 'market_end',
  },
]);

const eventOptions = computed(() => [
  {
    label: $t('page.research.tradePolicies.workbench.event.crypto'),
    value: 'crypto_subject_predicate_entered',
  },
  {
    label: $t('page.research.tradePolicies.workbench.event.weather'),
    value: 'weather_daily_temperature_predicate',
  },
]);

function defaultPrice(threshold = '0.5'): TradePolicyConditionTemplateNodeV1 {
  return {
    comparison: 'at_or_above',
    kind: 'price',
    max_input_age_ms: 2000,
    threshold,
  };
}

function nodeForKind(kind: TradePolicyConditionTemplateNodeV1['kind']) {
  switch (kind) {
    case 'all':
    case 'any': {
      return {
        children: [defaultPrice('0.45'), defaultPrice('0.55')],
        kind,
      } satisfies TradePolicyConditionTemplateNodeV1;
    }
    case 'clock': {
      return {
        anchor: 'recommendation_decision',
        kind: 'clock',
        offset_ms: 0,
      } satisfies TradePolicyConditionTemplateNodeV1;
    }
    case 'factor': {
      const factor = props.factorOptions[0];
      return {
        comparison: 'at_or_above',
        definition_hash: factor?.definitionHash ?? '',
        definition_id: factor?.value ?? '',
        kind: 'factor',
        max_input_age_ms: 60_000,
        measure: 'normalized',
        minimum_confidence: '0.8',
        threshold: '0',
      } satisfies TradePolicyConditionTemplateNodeV1;
    }
    case 'market_event': {
      return {
        event: {
          kind: 'crypto_subject_predicate_entered',
          max_input_age_ms: 2000,
        },
        kind: 'market_event',
      } satisfies TradePolicyConditionTemplateNodeV1;
    }
    case 'price': {
      return defaultPrice();
    }
  }
}

function replace(value: TradePolicyConditionTemplateNodeV1) {
  emit('update:modelValue', value);
}

function patch(fields: Record<string, unknown>) {
  replace({
    ...props.modelValue,
    ...fields,
  } as TradePolicyConditionTemplateNodeV1);
}

function changeKind(kind: TradePolicyConditionTemplateNodeV1['kind']) {
  replace(nodeForKind(kind));
}

function changeFactor(definitionId: string) {
  const factor = props.factorOptions.find(
    (item) => item.value === definitionId,
  );
  patch({
    definition_hash: factor?.definitionHash ?? '',
    definition_id: definitionId,
  });
}

function changeEvent(
  kind:
    | 'crypto_subject_predicate_entered'
    | 'weather_daily_temperature_predicate',
) {
  if (props.modelValue.kind !== 'market_event') return;
  replace({
    event: { kind, max_input_age_ms: props.modelValue.event.max_input_age_ms },
    kind: 'market_event',
  });
}

function updateEventFreshness(value: number) {
  if (props.modelValue.kind !== 'market_event') return;
  replace({
    ...props.modelValue,
    event: { ...props.modelValue.event, max_input_age_ms: value },
  });
}

function updateChild(index: number, child: TradePolicyConditionTemplateNodeV1) {
  if (props.modelValue.kind !== 'all' && props.modelValue.kind !== 'any')
    return;
  const children = [...props.modelValue.children];
  children[index] = child;
  replace({ ...props.modelValue, children });
}

function addChild() {
  if (props.modelValue.kind !== 'all' && props.modelValue.kind !== 'any')
    return;
  const index = props.modelValue.children.length;
  replace({
    ...props.modelValue,
    children: [
      ...props.modelValue.children,
      defaultPrice((0.4 + index * 0.05).toFixed(2)),
    ],
  });
}

function removeChild(index: number) {
  if (props.modelValue.kind !== 'all' && props.modelValue.kind !== 'any')
    return;
  replace({
    ...props.modelValue,
    children: props.modelValue.children.filter(
      (_, childIndex) => childIndex !== index,
    ),
  });
}
</script>

<template>
  <Card class="condition-node" size="small">
    <div class="node-grid">
      <label>
        <span>{{ $t('page.research.tradePolicies.workbench.node.kind') }}</span>
        <Select
          :options="kindOptions"
          :value="modelValue.kind"
          @change="changeKind"
        />
      </label>

      <template v-if="modelValue.kind === 'price'">
        <label>
          <span>{{
            $t('page.research.tradePolicies.workbench.node.comparison')
          }}</span>
          <Select
            :options="comparisonOptions"
            :value="modelValue.comparison"
            @change="(value) => patch({ comparison: value })"
          />
        </label>
        <label>
          <span>{{
            $t('page.research.tradePolicies.workbench.node.threshold')
          }}</span>
          <Input
            :value="modelValue.threshold"
            @update:value="(value) => patch({ threshold: value })"
          />
        </label>
        <label>
          <span>{{
            $t('page.research.tradePolicies.workbench.node.freshness')
          }}</span>
          <InputNumber
            :min="1"
            :value="modelValue.max_input_age_ms"
            @update:value="(value) => patch({ max_input_age_ms: value })"
          />
        </label>
      </template>

      <template v-else-if="modelValue.kind === 'clock'">
        <label>
          <span>{{
            $t('page.research.tradePolicies.workbench.node.anchor')
          }}</span>
          <Select
            :options="anchorOptions"
            :value="modelValue.anchor"
            @change="(value) => patch({ anchor: value })"
          />
        </label>
        <label>
          <span>{{
            $t('page.research.tradePolicies.workbench.node.offset')
          }}</span>
          <InputNumber
            :value="modelValue.offset_ms"
            @update:value="(value) => patch({ offset_ms: value })"
          />
        </label>
      </template>

      <template v-else-if="modelValue.kind === 'factor'">
        <label class="span-two">
          <span>{{
            $t('page.research.tradePolicies.workbench.node.factorDefinition')
          }}</span>
          <Select
            show-search
            option-filter-prop="label"
            :options="factorOptions"
            :value="modelValue.definition_id"
            @change="changeFactor"
          />
        </label>
        <label>
          <span>{{
            $t('page.research.tradePolicies.workbench.node.measure')
          }}</span>
          <Select
            :options="[
              { label: 'normalized', value: 'normalized' },
              { label: 'raw', value: 'raw' },
            ]"
            :value="modelValue.measure"
            @change="(value) => patch({ measure: value })"
          />
        </label>
        <label>
          <span>{{
            $t('page.research.tradePolicies.workbench.node.comparison')
          }}</span>
          <Select
            :options="comparisonOptions"
            :value="modelValue.comparison"
            @change="(value) => patch({ comparison: value })"
          />
        </label>
        <label>
          <span>{{
            $t('page.research.tradePolicies.workbench.node.threshold')
          }}</span>
          <Input
            :value="modelValue.threshold"
            @update:value="(value) => patch({ threshold: value })"
          />
        </label>
        <label>
          <span>{{
            $t('page.research.tradePolicies.workbench.node.confidence')
          }}</span>
          <Input
            :value="modelValue.minimum_confidence"
            @update:value="(value) => patch({ minimum_confidence: value })"
          />
        </label>
        <label>
          <span>{{
            $t('page.research.tradePolicies.workbench.node.freshness')
          }}</span>
          <InputNumber
            :min="1"
            :value="modelValue.max_input_age_ms"
            @update:value="(value) => patch({ max_input_age_ms: value })"
          />
        </label>
      </template>

      <template v-else-if="modelValue.kind === 'market_event'">
        <label class="span-two">
          <span>{{
            $t('page.research.tradePolicies.workbench.node.event')
          }}</span>
          <Select
            :options="eventOptions"
            :value="modelValue.event.kind"
            @change="changeEvent"
          />
        </label>
        <label>
          <span>{{
            $t('page.research.tradePolicies.workbench.node.freshness')
          }}</span>
          <InputNumber
            :min="1"
            :value="modelValue.event.max_input_age_ms"
            @update:value="updateEventFreshness"
          />
        </label>
      </template>
    </div>

    <template v-if="modelValue.kind === 'all' || modelValue.kind === 'any'">
      <div class="children">
        <div
          v-for="(child, index) in modelValue.children"
          :key="index"
          class="child-row"
        >
          <ConditionTemplateNodeEditor
            :depth="depth + 1"
            :factor-options="factorOptions"
            :model-value="child"
            @update:model-value="(value) => updateChild(index, value)"
          />
          <Button
            danger
            :disabled="modelValue.children.length <= 2"
            @click="removeChild(index)"
          >
            {{ $t('common.delete') }}
          </Button>
        </div>
        <Space>
          <Button
            :disabled="modelValue.children.length >= 8 || depth >= 4"
            @click="addChild"
          >
            {{ $t('page.research.tradePolicies.workbench.node.addChild') }}
          </Button>
          <span class="muted">{{ modelValue.children.length }} / 8</span>
        </Space>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.condition-node {
  width: 100%;
}

.node-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

label {
  display: grid;
  gap: 4px;
}

label > span,
.muted {
  font-size: 12px;
  color: var(--vben-text-color-secondary);
}

.span-two {
  grid-column: 1 / -1;
}

.children {
  display: grid;
  gap: 12px;
  padding-left: 12px;
  margin-top: 12px;
  border-left: 2px solid var(--vben-border-color);
}

.child-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: start;
}

:deep(.ant-input-number),
:deep(.ant-select) {
  width: 100%;
}

@media (max-width: 720px) {
  .node-grid,
  .child-row {
    grid-template-columns: 1fr;
  }
}
</style>
