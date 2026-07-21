<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';
import type { QuantRecommendationView } from '@vben/types';

import { computed, onUnmounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { usePreferences } from '@vben/preferences';

import {
  useDocumentVisibility,
  useIdle,
  usePreferredReducedMotion,
} from '@vueuse/core';
import { Button, Empty, Tag } from 'antdv-next';

import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import { formatUsd } from '#/shared/components/format';
import { themeColors } from '#/shared/components/theme-color';

defineOptions({ name: 'DashboardRecommendationOrbit' });

const props = defineProps<{
  paused?: boolean;
  recommendations: QuantRecommendationView[];
}>();
const emit = defineEmits<{
  select: [recommendation: QuantRecommendationView];
}>();

const chartRef = ref<EchartsUIType>();
const focused = ref(false);
const hovered = ref(false);
const manuallyPaused = ref(false);
const angle = ref(90);
const visibility = useDocumentVisibility();
const { idle } = useIdle(5000);
const reducedMotion = usePreferredReducedMotion();
const { isDark } = usePreferences();
const { getChartInstance, renderEcharts, updateData } = useEcharts(chartRef);
let timer: ReturnType<typeof setInterval> | undefined;

const shouldRotate = computed(
  () =>
    reducedMotion.value !== 'reduce' &&
    visibility.value === 'visible' &&
    idle.value &&
    !hovered.value &&
    !focused.value &&
    !props.paused &&
    !manuallyPaused.value,
);

const chartData = computed(() => {
  void isDark.value;
  const orbitPalette = themeColors.visual;
  return props.recommendations.map((recommendation) => ({
    category: recommendation.identity.category,
    confidence: recommendation.confidence,
    itemStyle: {
      color:
        orbitPalette[(recommendation.rank - 1) % orbitPalette.length] ??
        orbitPalette[0],
      opacity: Math.max(0.75, Number(recommendation.confidence)),
    },
    name: `#${recommendation.rank} ${recommendation.identity.outcome_name}`,
    recommendationId: recommendation.recommendation_id,
    value: Math.max(1, Number(recommendation.confidence) * 75),
  }));
});

async function render() {
  if (props.recommendations.length === 0) return;
  const instance = await renderEcharts({
    angleAxis: {
      axisLabel: {
        color: themeColors.foreground,
        fontWeight: 600,
        formatter: (_value: string, index: number) =>
          `#${props.recommendations[index]?.rank ?? index + 1}`,
        interval: 0,
      },
      axisLine: { lineStyle: { color: themeColors.border } },
      axisTick: { show: false },
      data: props.recommendations.map(
        (recommendation) => recommendation.identity.outcome_name,
      ),
      startAngle: angle.value,
      type: 'category',
    },
    animationDuration: reducedMotion.value === 'reduce' ? 0 : 220,
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
          color: [themeColors.muted, themeColors.border],
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
          ? `${data.name}<br/>${$t('page.dashboard.orbit.confidence')}: ${recommendation.confidence}`
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

function syncTimer() {
  if (timer) clearInterval(timer);
  timer = undefined;
  if (!shouldRotate.value) return;
  timer = setInterval(() => {
    angle.value = (angle.value + 15) % 360;
    void updateData({
      angleAxis: { startAngle: angle.value },
      animationDurationUpdate: 1000,
      animationEasingUpdate: 'linear',
    });
  }, 1000);
}

function select(recommendation: QuantRecommendationView) {
  emit('select', recommendation);
}

watch(
  [() => props.recommendations, chartData, reducedMotion, isDark],
  () => void render(),
  { deep: true, immediate: true },
);
watch(shouldRotate, syncTimer, { immediate: true });
onUnmounted(() => {
  if (timer) clearInterval(timer);
  getChartInstance()?.off('click');
});
</script>

<template>
  <DashboardPanel
    :title="$t('page.dashboard.orbit.title')"
    icon="lucide:orbit"
    tone="violet"
  >
    <template #extra>
      <Button
        v-if="recommendations.length > 0 && reducedMotion !== 'reduce'"
        :aria-label="
          manuallyPaused
            ? $t('page.dashboard.orbit.play')
            : $t('page.dashboard.orbit.pause')
        "
        size="small"
        type="text"
        @click="manuallyPaused = !manuallyPaused"
      >
        {{
          manuallyPaused
            ? $t('page.dashboard.orbit.play')
            : $t('page.dashboard.orbit.pause')
        }}
      </Button>
    </template>
    <div
      v-if="recommendations.length > 0"
      @focusin="focused = true"
      @focusout="focused = false"
      @mouseenter="hovered = true"
      @mouseleave="hovered = false"
    >
      <EchartsUI ref="chartRef" class="hidden md:block" height="330px" />
      <ol class="mt-2 grid gap-2" :aria-label="$t('page.dashboard.orbit.list')">
        <li
          v-for="recommendation in recommendations"
          :key="recommendation.recommendation_id"
        >
          <button
            class="hover:bg-accent focus-visible:ring-primary flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-xs focus-visible:ring-2 focus-visible:outline-none"
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
            <span
              v-if="recommendation.trade_plan.kind === 'frozen'"
              class="tabular-nums"
            >
              {{ formatUsd(recommendation.trade_plan.sizing.suggested_usd) }}
            </span>
          </button>
        </li>
      </ol>
    </div>
    <Empty
      v-else
      :description="$t('page.dashboard.section.noReport')"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />
  </DashboardPanel>
</template>
