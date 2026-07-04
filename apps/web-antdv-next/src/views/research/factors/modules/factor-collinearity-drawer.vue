<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';
import type { FactorCollinearityView } from '@vben/types';

import { computed, ref, watch } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { useRequestHandler } from '@vben/request/qp';

import { useDebounceFn, useResizeObserver } from '@vueuse/core';
import {
  Alert,
  Descriptions,
  DescriptionsItem,
  Empty,
  Spin,
  Table,
} from 'antdv-next';

import { getFactorCollinearity } from '#/api/research';
import { $t } from '#/locales';
import { parseDecimal } from '#/shared/components/format';

defineOptions({ name: 'FactorCollinearityDrawer' });

const CHART_HEIGHT = '420px';

const { handleRequest } = useRequestHandler();
const report = ref<FactorCollinearityView | null>(null);
const loading = ref(false);

const chartRef = ref<EchartsUIType>();
const chartAreaRef = ref<HTMLElement | null>(null);
const { renderEcharts, resize } = useEcharts(chartRef);

const hasData = computed(
  () => (report.value?.factors.length ?? 0) > 0 && report.value !== null,
);

const violationColumns = [
  {
    dataIndex: 'left',
    key: 'left',
    title: $t('page.research.factors.collinearity.columns.left'),
  },
  {
    dataIndex: 'right',
    key: 'right',
    title: $t('page.research.factors.collinearity.columns.right'),
  },
  {
    align: 'right' as const,
    dataIndex: 'correlation',
    key: 'correlation',
    title: $t('page.research.factors.collinearity.columns.correlation'),
    width: 140,
  },
];

useResizeObserver(
  chartAreaRef,
  useDebounceFn(() => resize(), 200),
);

async function load() {
  loading.value = true;
  try {
    report.value = await handleRequest(() => getFactorCollinearity(), {
      silent: true,
    });
  } finally {
    loading.value = false;
  }
}

function render() {
  const current = report.value;
  if (!current || current.factors.length === 0) {
    return;
  }
  const cells: [number, number, number][] = [];
  current.matrix.forEach((row, i) => {
    row.forEach((value, j) => {
      const rho = parseDecimal(value)?.toNumber() ?? 0;
      cells.push([j, i, Number(rho.toFixed(4))]);
    });
  });
  void renderEcharts({
    grid: { bottom: 110, left: 130, right: 24, top: 24 },
    series: [
      {
        data: cells,
        emphasis: { itemStyle: { shadowBlur: 6 } },
        label: { formatter: '{@[2]}', show: current.factors.length <= 14 },
        name: 'rho',
        type: 'heatmap',
      },
    ],
    tooltip: { position: 'top' },
    visualMap: {
      bottom: 10,
      calculable: true,
      inRange: { color: ['#2f6fed', '#f5f5f5', '#e0533d'] },
      left: 'center',
      max: 1,
      min: -1,
      orient: 'horizontal',
    },
    xAxis: {
      axisLabel: { interval: 0, rotate: 60 },
      data: current.factors,
      splitArea: { show: true },
      type: 'category',
    },
    yAxis: {
      axisLabel: { interval: 0 },
      data: current.factors,
      splitArea: { show: true },
      type: 'category',
    },
  });
}

watch(report, () => render());

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      void load();
    } else {
      report.value = null;
    }
  },
});

defineExpose({ open: () => drawerApi.open() });
</script>

<template>
  <Drawer
    :title="$t('page.research.factors.collinearity.title')"
    class="w-full max-w-4xl"
  >
    <Spin :spinning="loading">
      <div class="flex flex-col gap-4">
        <Alert
          :message="$t('page.research.factors.collinearity.hint')"
          type="info"
          show-icon
        />
        <Descriptions v-if="report" :column="3" bordered size="small">
          <DescriptionsItem
            :label="$t('page.research.factors.collinearity.threshold')"
          >
            {{ report.threshold }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.factors.collinearity.observations')"
          >
            {{ report.observation_count }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.factors.collinearity.lookback')"
          >
            {{ Math.round(report.lookback_secs / 3600) }}h
          </DescriptionsItem>
        </Descriptions>

        <div
          ref="chartAreaRef"
          :style="{ height: CHART_HEIGHT }"
          class="relative w-full"
        >
          <EchartsUI v-if="hasData" ref="chartRef" :height="CHART_HEIGHT" />
          <div v-else class="flex h-full items-center justify-center">
            <Empty
              :description="$t('page.research.factors.collinearity.empty')"
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
            />
          </div>
        </div>

        <template v-if="report && report.violations.length > 0">
          <Alert
            :message="
              $t('page.research.factors.collinearity.violationsTitle', {
                count: report.violations.length,
              })
            "
            type="warning"
            show-icon
          />
          <Table
            :columns="violationColumns"
            :data-source="report.violations"
            :pagination="false"
            row-key="left"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'correlation'">
                <span class="text-destructive font-mono">
                  {{ record.correlation }}
                </span>
              </template>
            </template>
          </Table>
        </template>
        <Alert
          v-else-if="report && hasData"
          :message="$t('page.research.factors.collinearity.clean')"
          type="success"
          show-icon
        />
      </div>
    </Spin>
  </Drawer>
</template>
