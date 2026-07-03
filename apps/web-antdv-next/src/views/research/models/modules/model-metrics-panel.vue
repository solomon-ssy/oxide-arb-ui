<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { computed, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { useDebounceFn, useResizeObserver } from '@vueuse/core';
import {
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

const folds = computed(() => {
  const raw = validation.value?.fold_objectives;
  return Array.isArray(raw) ? raw.map((value) => asString(value) ?? '') : [];
});

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

    <!-- Cross-validation summary (both trained families). -->
    <Descriptions v-if="validation" :column="2" bordered size="small">
      <DescriptionsItem
        :label="$t('page.research.models.detail.metricsPanel.meanObjective')"
      >
        {{ formatScore(asString(validation?.mean_objective)) }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="
          $t('page.research.models.detail.metricsPanel.validationSamples')
        "
      >
        {{ asString(validation?.sample_count) }}
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
