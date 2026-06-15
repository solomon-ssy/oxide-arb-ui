<script lang="ts" setup>
import type { EchartsUIType, ECOption } from '@vben/plugins/echarts';
import type { EdgeBucket } from '@vben/types';

import { computed, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { $t } from '#/locales';
import EchartsCard from '#/shared/components/echarts-card.vue';

defineOptions({ name: 'AnalyticsEdgeDistributionChart' });

const props = withDefaults(
  defineProps<{
    buckets: EdgeBucket[];
    error?: null | string;
    loading?: boolean;
  }>(),
  { error: null, loading: false },
);

const chartRef = ref<EchartsUIType>();
const { renderEcharts, resize } = useEcharts(chartRef);

const isEmpty = computed(
  () =>
    !props.loading &&
    !props.error &&
    props.buckets.every((bucket) => bucket.count === 0),
);

function buildOption(): ECOption {
  return {
    grid: { bottom: 32, left: 48, right: 16, top: 24 },
    series: [
      {
        data: props.buckets.map((bucket) => bucket.count),
        name: $t('page.analytics.charts.edgeDistribution.series'),
        type: 'bar',
      },
    ],
    tooltip: {
      formatter: (params: any) => {
        const item = Array.isArray(params) ? params[0] : params;
        const bucket = props.buckets[item?.dataIndex ?? -1];
        return bucket
          ? [
              `${$t('page.analytics.charts.edgeDistribution.bucket')}: ${bucket.label}`,
              `${$t('page.analytics.charts.edgeDistribution.trades')}: ${bucket.count}`,
            ].join('<br/>')
          : '';
      },
      trigger: 'axis',
    },
    xAxis: {
      data: props.buckets.map((bucket) => bucket.label),
      type: 'category',
    },
    yAxis: { minInterval: 1, type: 'value' },
  };
}

watch(
  () => [props.buckets, props.loading, props.error],
  () => {
    if (!props.loading && !props.error && !isEmpty.value) {
      void renderEcharts(buildOption());
    }
  },
  { immediate: true },
);
</script>

<template>
  <EchartsCard
    :empty="isEmpty"
    :error="error"
    icon="lucide:chart-no-axes-column"
    :loading="loading"
    tone="cyan"
    :title="$t('page.analytics.charts.edgeDistribution.title')"
    @resize="resize"
  >
    <template #extra>
      <span class="text-muted-foreground text-xs">
        {{ $t('page.analytics.basis.execution') }}
      </span>
    </template>
    <EchartsUI ref="chartRef" class="h-full" />
  </EchartsCard>
</template>
