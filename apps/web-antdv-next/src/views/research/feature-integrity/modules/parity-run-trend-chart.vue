<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';
import type {
  FeatureParityRunKind,
  FeatureParityRunStatus,
  FeatureParityRunView,
} from '@vben/types';

import type { ParityRunTrendPoint } from './parity-run-trend';

import { computed, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import {
  FEATURE_PARITY_RUN_KINDS,
  FEATURE_PARITY_RUN_STATUSES,
} from '@vben/types';

import { useDebounceFn, useResizeObserver } from '@vueuse/core';
import { Alert, Card, Empty, Skeleton, Tag } from 'antdv-next';

import { $t } from '#/locales';
import {
  findTagOption,
  useFeatureParityRunKindTagOptions,
  useFeatureParityRunStatusTagOptions,
} from '#/shared/components/format/tag-options';

import { buildParityRunTrend } from './parity-run-trend';

defineOptions({ name: 'ParityRunTrendChart' });

const props = defineProps<{
  error: boolean;
  loading: boolean;
  runs: FeatureParityRunView[];
}>();

const CHART_HEIGHT = '320px';
const METRIC_COLORS = {
  comparedCount: '#1677ff',
  mismatchedCount: '#ff4d4f',
  pendingCount: '#faad14',
} as const;
const STATUS_COLORS: Record<FeatureParityRunStatus, string> = {
  failed: '#ff4d4f',
  mismatched: '#cf1322',
  passed: '#52c41a',
  pending_materialization: '#faad14',
  queued: '#8c8c8c',
  running: '#1677ff',
};
const kinds = Object.values(FEATURE_PARITY_RUN_KINDS);
const statuses = Object.values(FEATURE_PARITY_RUN_STATUSES);

const chartRef = ref<EchartsUIType>();
const chartAreaRef = ref<HTMLElement | null>(null);
const { renderEcharts, resize } = useEcharts(chartRef);
const trend = computed(() => buildParityRunTrend(props.runs));
const hasData = computed(() => trend.value.points.length > 0);
const kindTagOptions = useFeatureParityRunKindTagOptions();
const statusTagOptions = useFeatureParityRunStatusTagOptions();
const visibleKinds = computed(() =>
  kinds.filter((kind) =>
    trend.value.points.some((point) => point.kind === kind),
  ),
);
const visibleStatuses = computed(() =>
  statuses.filter((status) =>
    trend.value.points.some((point) => point.status === status),
  ),
);

useResizeObserver(
  chartAreaRef,
  useDebounceFn(() => resize(), 200),
);

type MetricKey = 'comparedCount' | 'mismatchedCount' | 'pendingCount';

function metricLabel(key: MetricKey): string {
  return $t(`page.research.featureIntegrity.trend.${key}`);
}

function runKindLabel(kind: FeatureParityRunKind): string {
  return $t(`enum.featureParityRunKind.${kind}`);
}

function seriesData(
  points: readonly ParityRunTrendPoint[],
  kind: FeatureParityRunKind,
  metric: MetricKey,
) {
  return points
    .filter((point) => point.kind === kind)
    .map((point) => ({
      ...(metric === 'comparedCount'
        ? {
            itemStyle: {
              borderColor: '#ffffff',
              borderWidth: 1,
              color: STATUS_COLORS[point.status],
            },
          }
        : {}),
      value: [point.createdAt, point[metric]],
    }));
}

function render() {
  const points = trend.value.points;
  if (points.length === 0) {
    return;
  }

  const metricKeys: MetricKey[] = [
    'comparedCount',
    'mismatchedCount',
    'pendingCount',
  ];
  void renderEcharts({
    grid: { bottom: 52, containLabel: true, left: 16, right: 24, top: 24 },
    legend: { bottom: 0, type: 'scroll' },
    series: kinds.flatMap((kind) =>
      metricKeys.map((metric) => ({
        connectNulls: false,
        data: seriesData(points, kind, metric),
        emphasis: { focus: 'series' },
        lineStyle: {
          color: METRIC_COLORS[metric],
          type: kind === FEATURE_PARITY_RUN_KINDS.full ? 'solid' : 'dashed',
          width: metric === 'comparedCount' ? 2 : 1.5,
        },
        name: `${metricLabel(metric)} · ${runKindLabel(kind)}`,
        showSymbol: metric === 'comparedCount',
        symbol: kind === FEATURE_PARITY_RUN_KINDS.full ? 'diamond' : 'circle',
        symbolSize: 9,
        type: 'line',
      })),
    ),
    tooltip: { axisPointer: { type: 'cross' }, trigger: 'axis' },
    xAxis: { type: 'time' },
    yAxis: {
      min: 0,
      minInterval: 1,
      name: $t('page.research.featureIntegrity.trend.countAxis'),
      type: 'value',
    },
  });
}

watch(
  [trend, () => props.loading],
  () => {
    if (!props.loading) {
      render();
    }
  },
  { flush: 'post', immediate: true },
);
</script>

<template>
  <Card size="small" :title="$t('page.research.featureIntegrity.trend.title')">
    <p class="text-muted-foreground mb-3 text-xs">
      {{ $t('page.research.featureIntegrity.trend.subtitle') }}
    </p>
    <Alert
      v-if="error"
      class="mb-3"
      :message="$t('page.research.featureIntegrity.trend.loadError')"
      show-icon
      type="warning"
    />
    <Alert
      v-if="trend.rejectedCount > 0"
      class="mb-3"
      :message="
        $t('page.research.featureIntegrity.trend.rejectedRows', {
          count: trend.rejectedCount,
        })
      "
      show-icon
      type="warning"
    />

    <div
      ref="chartAreaRef"
      :style="{ height: CHART_HEIGHT }"
      class="relative w-full"
    >
      <Skeleton v-if="loading" :paragraph="{ rows: 8 }" active :title="false" />
      <EchartsUI v-else-if="hasData" ref="chartRef" :height="CHART_HEIGHT" />
      <div v-else class="flex h-full items-center justify-center">
        <Empty
          :description="$t('page.research.featureIntegrity.trend.empty')"
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        />
      </div>
    </div>

    <div v-if="hasData" class="mt-3 flex flex-wrap items-center gap-2">
      <span class="text-muted-foreground text-xs">
        {{ $t('page.research.featureIntegrity.trend.runKinds') }}
      </span>
      <Tag
        v-for="kind in visibleKinds"
        :key="kind"
        :color="findTagOption(kindTagOptions, kind)?.color"
      >
        {{ findTagOption(kindTagOptions, kind)?.label }}
      </Tag>
      <span class="text-muted-foreground ml-2 text-xs">
        {{ $t('page.research.featureIntegrity.trend.markerStatus') }}
      </span>
      <Tag
        v-for="status in visibleStatuses"
        :key="status"
        :color="findTagOption(statusTagOptions, status)?.color"
      >
        {{ findTagOption(statusTagOptions, status)?.label }}
      </Tag>
    </div>
  </Card>
</template>
