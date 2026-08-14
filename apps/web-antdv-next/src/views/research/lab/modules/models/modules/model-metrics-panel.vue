<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';
import type {
  ModelVersionMetrics,
  ObjectiveComponentMetrics,
  RankingDiagnosticsMetrics,
} from '@vben/types';

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

import { $t } from '#/locales';
import { formatScore } from '#/shared/components/format';

defineOptions({ name: 'ModelMetricsPanel' });

const props = defineProps<{
  metrics?: ModelVersionMetrics;
}>();

/** Trainer metrics family the panel renders. */
type MetricsKind = 'classical' | 'not_measured' | 'weighted_factor';

const CHART_MAX_FEATURES = 20;

function asString(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  return String(value);
}

const definition = computed(() => props.metrics?.definition);

const kind = computed<MetricsKind>(() => {
  if (definition.value?.kind === 'learning_to_rank') {
    return 'weighted_factor';
  }
  if (definition.value?.kind === 'classical_pointwise') {
    return 'classical';
  }
  return 'not_measured';
});

const learningToRankMetrics = computed(() =>
  definition.value?.kind === 'learning_to_rank' ? definition.value : null,
);
const classicalMetrics = computed(() =>
  definition.value?.kind === 'classical_pointwise' ? definition.value : null,
);
const notMeasuredRationale = computed(() =>
  definition.value?.kind === 'not_measured' ? definition.value.rationale : null,
);
const validation = computed(() => {
  const current = definition.value;
  return current?.kind === 'learning_to_rank' ||
    current?.kind === 'classical_pointwise'
    ? current.validation
    : null;
});
const inSampleComponents = computed(() =>
  definition.value?.kind === 'learning_to_rank'
    ? definition.value.in_sample.components
    : null,
);
const inSampleDiagnostics = computed(() =>
  definition.value?.kind === 'learning_to_rank'
    ? definition.value.in_sample.diagnostics
    : null,
);
const validationComponents = computed(
  () => validation.value?.held_out_components ?? null,
);
const validationDiagnostics = computed(
  () => validation.value?.held_out_diagnostics ?? null,
);

const folds = computed(() => {
  return (validation.value?.fold_objectives ?? []).map(
    (value) => asString(value) ?? '',
  );
});

const foldComponents = computed(() => validation.value?.fold_components ?? []);

const heldOutLabelKey = computed(() => {
  const metric = asString(validation.value?.held_out_metric);
  if (metric === 'mean_rolling_fold_rank_ic') {
    return 'page.research.models.detail.metricsPanel.heldOutMetricClassical';
  }
  if (
    metric === 'negative_total_learning_to_rank_loss' ||
    kind.value === 'weighted_factor'
  ) {
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

function diagnosticRows(diagnostics: null | RankingDiagnosticsMetrics) {
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
  const current = definition.value;
  if (current?.kind !== 'classical_pointwise') {
    return [];
  }
  return current.feature_importances
    .map((entry) => {
      const importance = Number(entry.importance);
      return {
        feature: entry.feature,
        importance: Number.isFinite(importance) ? importance : 0,
      };
    })
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

function componentRows(components: null | ObjectiveComponentMetrics) {
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
          {{
            formatScore(
              asString(learningToRankMetrics?.in_sample.objective_value),
            )
          }}
        </DescriptionsItem>
        <DescriptionsItem
          v-if="learningToRankMetrics?.in_sample.summary"
          :label="$t('page.research.models.detail.metricsPanel.summary')"
        >
          {{ learningToRankMetrics.in_sample.summary }}
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
          :label="$t('page.research.models.detail.metricsPanel.kind')"
        >
          {{ classicalMetrics?.model_kind }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.models.detail.metricsPanel.featureCount')"
        >
          {{ classicalMetrics?.in_sample.feature_count }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.models.detail.metricsPanel.trainSamples')"
        >
          {{ classicalMetrics?.in_sample.train_samples }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="
            $t('page.research.models.detail.metricsPanel.validationObjective')
          "
        >
          {{
            formatScore(
              asString(classicalMetrics?.in_sample.validation_objective),
            )
          }}
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

    <template v-if="kind === 'not_measured'">
      <Empty
        :description="
          notMeasuredRationale ||
          $t('page.research.models.detail.metricsPanel.empty')
        "
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />
    </template>
  </div>
</template>
