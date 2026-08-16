<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';
import type { QuantRecommendationView } from '@vben/types';

import { computed, onUnmounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { usePreferences } from '@vben/preferences';

import { Button, Empty, Tag } from 'antdv-next';
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from 'motion-v';

import { $t } from '#/locales';
import { formatBps, formatUsd } from '#/shared/components/format';
import InsightPanel from '#/shared/components/insight-panel.vue';
import { themeColors } from '#/shared/components/theme-color';

defineOptions({ name: 'DashboardRecommendationOrbit' });

const props = defineProps<{
  recommendations: QuantRecommendationView[];
}>();
const emit = defineEmits<{
  openReports: [];
  select: [recommendation: QuantRecommendationView];
}>();

const chartRef = ref<EchartsUIType>();
const reducedMotion = useReducedMotion();
const { isDark } = usePreferences();
const { getChartInstance, renderEcharts } = useEcharts(chartRef);

const chartData = computed(() => {
  void isDark.value;
  const orbitPalette = themeColors.categorical;
  return props.recommendations.map((recommendation) => {
    const profitProbability =
      Number(recommendation.economics.profit_probability_bps) / 10_000;
    return {
      category: recommendation.identity.category,
      itemStyle: {
        color:
          orbitPalette[(recommendation.rank - 1) % orbitPalette.length] ??
          orbitPalette[0],
        opacity: Math.max(0.75, profitProbability),
      },
      name: `#${recommendation.rank} ${recommendation.identity.outcome_name}`,
      recommendationId: recommendation.recommendation_id,
      value: Math.max(1, profitProbability * 75),
    };
  });
});

async function render() {
  if (props.recommendations.length === 0) return;
  const instance = await renderEcharts({
    animation: false,
    angleAxis: {
      axisLabel: {
        color: themeColors.text.primary,
        fontWeight: 600,
        formatter: (_value: string, index: number) =>
          `#${props.recommendations[index]?.rank ?? index + 1}`,
        interval: 0,
      },
      axisLine: { lineStyle: { color: themeColors.border.subtle } },
      axisTick: { show: false },
      data: props.recommendations.map(
        (recommendation) => recommendation.identity.outcome_name,
      ),
      startAngle: 90,
      type: 'category',
    },
    aria: {
      decal: { show: true },
      description: $t('page.dashboard.orbit.aria'),
      enabled: true,
    },
    polar: { center: ['50%', '50%'], radius: '78%' },
    radiusAxis: {
      axisLabel: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      max: 100,
      min: 0,
      splitLine: {
        lineStyle: {
          color: [themeColors.text.muted, themeColors.border.subtle],
          type: 'dashed',
        },
      },
      splitNumber: 4,
    },
    series: [
      {
        barGap: '-100%',
        coordinateSystem: 'polar',
        data: props.recommendations.map(() => 20),
        itemStyle: { color: 'transparent' },
        roundCap: true,
        silent: true,
        stack: 'orbit',
        type: 'bar',
      },
      {
        coordinateSystem: 'polar',
        data: chartData.value,
        emphasis: { focus: 'series' },
        roundCap: true,
        stack: 'orbit',
        type: 'bar',
      },
    ],
    tooltip: {
      formatter: (params: unknown) => {
        const data = (params as { data?: (typeof chartData.value)[number] })
          .data;
        if (!data?.recommendationId) return '';
        const recommendation = props.recommendations.find(
          (candidate) => candidate.recommendation_id === data.recommendationId,
        );
        return recommendation
          ? `${data.name}<br/>${$t('page.dashboard.orbit.confidence')}: ${formatBps(recommendation.economics.profit_probability_bps)}`
          : '';
      },
      trigger: 'item',
    },
  });
  instance?.off('click');
  instance?.on('click', (params: unknown) => {
    const id = (params as { data?: { recommendationId?: string } }).data
      ?.recommendationId;
    const recommendation = props.recommendations.find(
      (candidate) => candidate.recommendation_id === id,
    );
    if (recommendation) emit('select', recommendation);
  });
}

function select(recommendation: QuantRecommendationView) {
  emit('select', recommendation);
}

watch([() => props.recommendations, chartData, isDark], () => void render(), {
  deep: true,
  immediate: true,
});
onUnmounted(() => {
  getChartInstance()?.off('click');
});
</script>

<template>
  <InsightPanel
    :title="$t('page.dashboard.orbit.title')"
    featured
    icon="lucide:orbit"
    tone="violet"
  >
    <div v-if="recommendations.length > 0">
      <EchartsUI ref="chartRef" class="hidden md:block" height="330px" />
      <LayoutGroup>
        <ol
          class="mt-2 grid gap-2"
          :aria-label="$t('page.dashboard.orbit.list')"
        >
          <AnimatePresence :initial="false">
            <motion.li
              v-for="recommendation in recommendations"
              :key="recommendation.recommendation_id"
              :animate="reducedMotion ? undefined : { opacity: 1, y: 0 }"
              :exit="reducedMotion ? undefined : { opacity: 0, y: -4 }"
              :initial="reducedMotion ? false : { opacity: 0, y: 4 }"
              :layout="reducedMotion ? false : 'position'"
              :transition="{ duration: reducedMotion ? 0 : 0.18 }"
            >
              <button
                class="hover:bg-accent focus-visible:ring-primary flex min-h-11 w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-xs focus-visible:ring-2 focus-visible:outline-none"
                data-orbit-kind="recommendation"
                data-testid="dashboard-orbit-action"
                type="button"
                @click="select(recommendation)"
              >
                <span class="text-muted-foreground w-6">
                  #{{ recommendation.rank }}
                </span>
                <span class="min-w-0 flex-1 truncate">{{
                  recommendation.identity.question
                }}</span>
                <Tag>{{ recommendation.identity.outcome_name }}</Tag>
                <span class="tabular-nums">
                  {{
                    formatUsd(
                      recommendation.trade_plan.sizing.hard_reserved_cash_usd,
                    )
                  }}
                </span>
              </button>
            </motion.li>
          </AnimatePresence>
        </ol>
      </LayoutGroup>
    </div>
    <Empty
      v-else
      :description="$t('page.dashboard.section.noReport')"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    >
      <Button
        class="min-h-11 min-w-11"
        data-orbit-kind="empty"
        data-testid="dashboard-orbit-action"
        @click="emit('openReports')"
      >
        {{ $t('page.dashboard.orbit.openReports') }}
      </Button>
    </Empty>
  </InsightPanel>
</template>
