<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { computed, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { useDebounceFn, useResizeObserver } from '@vueuse/core';
import {
  Alert,
  Collapse,
  CollapsePanel,
  Descriptions,
  DescriptionsItem,
  Empty,
  Tag,
} from 'antdv-next';
import { Mode } from 'vanilla-jsoneditor';

import { $t } from '#/locales';
import { formatScore } from '#/shared/components/format';
import JsonEditorShell from '#/shared/components/json-editor/json-editor-shell.vue';

defineOptions({ name: 'ModelMetricsPanel' });

const props = defineProps<{
  metrics?: unknown;
}>();

/** Trainer metrics family the panel renders. */
type MetricsKind = 'classical' | 'unknown' | 'weighted_factor';

const CHART_MAX_FEATURES = 20;

function asRecord(value: unknown): null | Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  return String(value);
}

const record = computed(() => asRecord(props.metrics));

const kind = computed<MetricsKind>(() => {
  const metrics = record.value;
  if (!metrics) {
    return 'unknown';
  }
  const inSample = asRecord(metrics.in_sample);
  if (inSample && ('objective_value' in inSample || 'summary' in inSample)) {
    return 'weighted_factor';
  }
  if (
    Array.isArray(metrics.feature_importances) ||
    (inSample &&
      ('validation_objective' in inSample || 'feature_count' in inSample))
  ) {
    return 'classical';
  }
  return 'unknown';
});

const inSample = computed(() => asRecord(record.value?.in_sample));
const validation = computed(() => asRecord(record.value?.validation));
const inSampleComponents = computed(() => asRecord(inSample.value?.components));
const inSampleDiagnostics = computed(() =>
  asRecord(inSample.value?.diagnostics),
);
const validationComponents = computed(() =>
  asRecord(validation.value?.held_out_components),
);
const validationDiagnostics = computed(() =>
  asRecord(validation.value?.held_out_diagnostics),
);

const folds = computed(() => {
  const raw = validation.value?.fold_objectives;
  return Array.isArray(raw) ? raw.map((value) => asString(value) ?? '') : [];
});

const foldComponents = computed(() => {
  const raw = validation.value?.fold_components;
  if (!Array.isArray(raw)) {
    return [] as Record<string, unknown>[];
  }
  return raw
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null);
});

const heldOutLabelKey = computed(() => {
  const metric = asString(validation.value?.held_out_metric);
  if (metric === 'mean_rolling_fold_rank_ic') {
    return 'page.research.models.detail.metricsPanel.heldOutMetricClassical';
  }
  if (metric === 'neg_total_ltr_loss' || kind.value === 'weighted_factor') {
    return 'page.research.models.detail.metricsPanel.heldOutMetricLtr';
  }
  if (kind.value === 'classical') {
    return 'page.research.models.detail.metricsPanel.heldOutMetricClassical';
  }
  return 'page.research.models.detail.metricsPanel.heldOutObjective';
});

const diagnosticKeys = [
  'mean_rank_ic',
  'mean_ndcg_at_k',
  'ndcg_k',
  'group_count',
] as const;

function diagnosticRows(diagnostics: null | Record<string, unknown>) {
  if (!diagnostics) {
    return [];
  }
  return diagnosticKeys
    .filter((key) => diagnostics[key] !== undefined)
    .map((key) => ({
      key,
      value: asString(diagnostics[key]) ?? '',
    }));
}

const featureImportances = computed(() => {
  const raw = record.value?.feature_importances;
  if (!Array.isArray(raw)) {
    return [] as { feature: string; importance: number }[];
  }
  return raw
    .map((item) => {
      const entry = asRecord(item);
      const feature = asString(entry?.feature) ?? '';
      const importance = Number(asString(entry?.importance) ?? '0');
      return {
        feature,
        importance: Number.isFinite(importance) ? importance : 0,
      };
    })
    .filter((entry) => entry.feature !== '')
    .toSorted((a, b) => Math.abs(b.importance) - Math.abs(a.importance))
    .slice(0, CHART_MAX_FEATURES);
});

const componentKeys = [
  'rank_loss',
  'tail_penalty',
  'turnover_penalty',
  'l2_penalty',
  'total_loss',
  'group_count',
  'rank_loss_group_count',
  'pair_count',
] as const;

function componentRows(components: null | Record<string, unknown>) {
  if (!components) {
    return [];
  }
  return componentKeys
    .filter((key) => components[key] !== undefined)
    .map((key) => ({
      key,
      value: asString(components[key]) ?? '',
    }));
}

function isCountKey(key: string) {
  return key.endsWith('_count');
}

const chartRef = ref<EchartsUIType>();
const chartAreaRef = ref<HTMLElement | null>(null);
const { renderEcharts, resize } = useEcharts(chartRef);

const chartHeight = computed(
  () => `${Math.max(160, featureImportances.value.length * 22 + 40)}px`,
);

useResizeObserver(
  chartAreaRef,
  useDebounceFn(() => resize(), 200),
);

function render() {
  const rows = featureImportances.value;
  if (rows.length === 0) {
    return;
  }
  // Horizontal bar reads top-to-bottom, so reverse for descending importance.
  const ordered = [...rows].toReversed();
  void renderEcharts({
    grid: { bottom: 8, containLabel: true, left: 8, right: 24, top: 8 },
    series: [
      {
        data: ordered.map((entry) => entry.importance),
        type: 'bar',
      },
    ],
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'value' },
    yAxis: {
      data: ordered.map((entry) => entry.feature),
      type: 'category',
    },
  });
}

watch(featureImportances, () => render(), { immediate: true });
</script>

<template>
  <div class="flex flex-col gap-3">
    <template v-if="kind === 'weighted_factor'">
      <Descriptions :column="1" bordered size="small">
        <DescriptionsItem
          :label="$t('page.research.models.detail.metricsPanel.objectiveValue')"
        >
          {{ formatScore(asString(inSample?.objective_value)) }}
        </DescriptionsItem>
        <DescriptionsItem
          v-if="inSample?.summary"
          :label="$t('page.research.models.detail.metricsPanel.summary')"
        >
          {{ asString(inSample?.summary) }}
        </DescriptionsItem>
      </Descriptions>
      <Alert
        class="mb-1"
        :message="$t('page.research.models.detail.metricsPanel.proxyNote')"
        show-icon
        type="info"
      />
      <Descriptions
        v-if="componentRows(inSampleComponents).length > 0"
        :column="2"
        bordered
        size="small"
        :title="
          $t('page.research.models.detail.metricsPanel.inSampleComponents')
        "
      >
        <DescriptionsItem
          v-for="row in componentRows(inSampleComponents)"
          :key="row.key"
          :label="$t(`page.research.models.detail.metricsPanel.${row.key}`)"
        >
          {{ isCountKey(row.key) ? row.value : formatScore(row.value) }}
        </DescriptionsItem>
      </Descriptions>
      <Descriptions
        v-if="diagnosticRows(inSampleDiagnostics).length > 0"
        :column="2"
        bordered
        size="small"
        :title="
          $t('page.research.models.detail.metricsPanel.inSampleDiagnostics')
        "
      >
        <DescriptionsItem
          v-for="row in diagnosticRows(inSampleDiagnostics)"
          :key="row.key"
          :label="$t(`page.research.models.detail.metricsPanel.${row.key}`)"
        >
          {{
            row.key === 'ndcg_k' || row.key === 'group_count'
              ? row.value
              : formatScore(row.value)
          }}
        </DescriptionsItem>
      </Descriptions>
    </template>

    <template v-else-if="kind === 'classical'">
      <Descriptions :column="2" bordered size="small">
        <DescriptionsItem
          v-if="record?.kind"
          :label="$t('page.research.models.detail.metricsPanel.kind')"
        >
          {{ asString(record?.kind) }}
        </DescriptionsItem>
        <DescriptionsItem
          v-if="inSample?.feature_count !== undefined"
          :label="$t('page.research.models.detail.metricsPanel.featureCount')"
        >
          {{ asString(inSample?.feature_count) }}
        </DescriptionsItem>
        <DescriptionsItem
          v-if="inSample?.train_samples !== undefined"
          :label="$t('page.research.models.detail.metricsPanel.trainSamples')"
        >
          {{ asString(inSample?.train_samples) }}
        </DescriptionsItem>
        <DescriptionsItem
          v-if="inSample?.validation_objective !== undefined"
          :label="
            $t('page.research.models.detail.metricsPanel.validationObjective')
          "
        >
          {{ formatScore(asString(inSample?.validation_objective)) }}
        </DescriptionsItem>
      </Descriptions>
    </template>

    <!-- Cross-validation / held-out summary (both trained families). -->
    <Descriptions v-if="validation" :column="2" bordered size="small">
      <DescriptionsItem :label="$t(heldOutLabelKey)">
        {{ formatScore(asString(validation?.held_out_objective)) }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="
          $t('page.research.models.detail.metricsPanel.validationSamples')
        "
      >
        {{ asString(validation?.sample_count) }}
      </DescriptionsItem>
      <DescriptionsItem
        v-if="validation?.dropped_singleton_groups !== undefined"
        :label="
          $t('page.research.models.detail.metricsPanel.droppedSingletonGroups')
        "
      >
        {{ asString(validation?.dropped_singleton_groups) }}
      </DescriptionsItem>
      <DescriptionsItem
        v-if="validation?.dropped_singleton_rows !== undefined"
        :label="
          $t('page.research.models.detail.metricsPanel.droppedSingletonRows')
        "
      >
        {{ asString(validation?.dropped_singleton_rows) }}
      </DescriptionsItem>
    </Descriptions>

    <Descriptions
      v-if="componentRows(validationComponents).length > 0"
      :column="2"
      bordered
      size="small"
      :title="
        $t('page.research.models.detail.metricsPanel.validationComponents')
      "
    >
      <DescriptionsItem
        v-for="row in componentRows(validationComponents)"
        :key="row.key"
        :label="$t(`page.research.models.detail.metricsPanel.${row.key}`)"
      >
        {{ isCountKey(row.key) ? row.value : formatScore(row.value) }}
      </DescriptionsItem>
    </Descriptions>

    <Descriptions
      v-if="diagnosticRows(validationDiagnostics).length > 0"
      :column="2"
      bordered
      size="small"
      :title="
        $t('page.research.models.detail.metricsPanel.validationDiagnostics')
      "
    >
      <DescriptionsItem
        v-for="row in diagnosticRows(validationDiagnostics)"
        :key="row.key"
        :label="$t(`page.research.models.detail.metricsPanel.${row.key}`)"
      >
        {{
          row.key === 'ndcg_k' || row.key === 'group_count'
            ? row.value
            : formatScore(row.value)
        }}
      </DescriptionsItem>
    </Descriptions>

    <div v-if="folds.length > 0" class="flex flex-wrap gap-1">
      <span class="text-muted-foreground text-xs">
        {{ $t('page.research.models.detail.metricsPanel.folds') }}:
      </span>
      <Tag v-for="(fold, index) in folds" :key="index" :bordered="false">
        {{ index + 1 }}: {{ formatScore(fold) }}
      </Tag>
    </div>

    <Collapse v-if="foldComponents.length > 0" ghost>
      <CollapsePanel
        key="fold-components"
        :header="$t('page.research.models.detail.metricsPanel.foldComponents')"
      >
        <div
          v-for="(components, index) in foldComponents"
          :key="index"
          class="mb-3"
        >
          <div class="text-muted-foreground mb-1 text-xs">
            {{ $t('page.research.models.detail.metricsPanel.folds') }}
            {{ index + 1 }}
          </div>
          <Descriptions :column="2" bordered size="small">
            <DescriptionsItem
              v-for="row in componentRows(components)"
              :key="row.key"
              :label="$t(`page.research.models.detail.metricsPanel.${row.key}`)"
            >
              {{ isCountKey(row.key) ? row.value : formatScore(row.value) }}
            </DescriptionsItem>
          </Descriptions>
        </div>
      </CollapsePanel>
    </Collapse>

    <div v-if="featureImportances.length > 0" class="flex flex-col gap-1">
      <span class="text-muted-foreground text-xs">
        {{ $t('page.research.models.detail.metricsPanel.featureImportances') }}
      </span>
      <div ref="chartAreaRef" :style="{ height: chartHeight }" class="w-full">
        <EchartsUI ref="chartRef" :height="chartHeight" />
      </div>
    </div>

    <!-- Only truly polymorphic (unknown family) metrics fall back to raw JSON. -->
    <template v-if="kind === 'unknown'">
      <Empty
        v-if="!record"
        :description="$t('page.research.models.detail.metricsPanel.empty')"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />
      <Collapse v-else ghost>
        <CollapsePanel
          key="raw"
          :header="$t('page.research.models.detail.metricsPanel.raw')"
        >
          <JsonEditorShell :model-value="metrics" :mode="Mode.tree" read-only />
        </CollapsePanel>
      </Collapse>
    </template>
  </div>
</template>
