<script lang="ts" setup>
import type { EchartsUIType, ECOption } from '@vben/plugins/echarts';
import type { UsdString } from '@vben/types';

import { computed, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { $t } from '#/locales';
import EchartsCard from '#/shared/components/echarts-card.vue';
import {
  formatPercent,
  formatUsd,
  parseDecimal,
} from '#/shared/components/format';

defineOptions({ name: 'RiskDailyLossGauge' });

const props = withDefaults(
  defineProps<{
    dailyLoss: null | UsdString;
    limit: null | UsdString;
    loading?: boolean;
  }>(),
  { loading: false },
);

const chartRef = ref<EchartsUIType>();
const { renderEcharts, resize } = useEcharts(chartRef);

const ratio = computed(() => {
  const loss = parseDecimal(props.dailyLoss);
  const limit = parseDecimal(props.limit);
  if (loss === null || limit === null || limit.lte(0)) {
    return null;
  }
  return loss.div(limit);
});

const showGauge = computed(() => ratio.value !== null);

/** Degraded view when the operator cannot read runtime-config limits. */
const showAbsolute = computed(
  () => !showGauge.value && props.dailyLoss !== null,
);

const isEmpty = computed(
  () => !props.loading && !showGauge.value && !showAbsolute.value,
);

const subtitle = computed(() => {
  if (showGauge.value) {
    return `${formatUsd(props.dailyLoss)} / ${formatUsd(props.limit)}`;
  }
  if (showAbsolute.value) {
    return $t('page.risk.dailyLoss.absoluteOnly');
  }
  return '';
});

function buildOption(): ECOption {
  const rawPercent = ratio.value?.mul(100).toNumber() ?? 0;
  const percent = Math.min(Math.max(rawPercent, 0), 100);
  return {
    series: [
      {
        axisLine: {
          lineStyle: {
            color: [
              [0.7, '#16a34a'],
              [0.9, '#f59e0b'],
              [1, '#dc2626'],
            ],
            width: 14,
          },
        },
        data: [{ value: percent }],
        detail: {
          formatter: `${formatPercent(ratio.value?.toString() ?? null, 1)}`,
          fontSize: 20,
        },
        max: 100,
        min: 0,
        pointer: { length: '55%' },
        progress: { show: true, width: 14 },
        radius: '90%',
        splitNumber: 5,
        title: { show: false },
        type: 'gauge',
      },
    ],
  };
}

watch(
  () => [props.dailyLoss, props.limit],
  () => {
    if (showGauge.value) {
      void renderEcharts(buildOption());
    }
  },
  { immediate: true },
);
</script>

<template>
  <EchartsCard
    height="260px"
    icon="lucide:gauge"
    tone="amber"
    :empty="isEmpty"
    :loading="loading"
    :title="$t('page.risk.dailyLoss.title')"
    @resize="resize"
  >
    <template #extra>
      <span v-if="subtitle" class="text-muted-foreground text-xs">
        {{ subtitle }}
      </span>
    </template>
    <div v-if="showAbsolute" class="flex h-full items-center justify-center">
      <span class="font-mono text-3xl font-semibold">
        {{ formatUsd(dailyLoss) }}
      </span>
    </div>
    <EchartsUI v-else ref="chartRef" />
  </EchartsCard>
</template>
