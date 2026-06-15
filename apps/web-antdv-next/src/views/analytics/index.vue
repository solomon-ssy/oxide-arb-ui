<script lang="ts" setup>
import type {
  AnalyticsDailyPoint,
  AnalyticsQueryParams,
  EdgeBucket,
  ExecutionMode,
  IsoDate,
  MarketPerformanceRow,
  Paginated,
  WeeklyReport,
} from '@vben/types';

import type { MarketPerformanceGridRow } from './modules/schemas';

import type {
  AnalyticsWindowPreset,
  UtcDayRange,
} from '#/shared/composables/use-analytics-window';

import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/oxide';
import { EXECUTION_MODES } from '@vben/types';

import {
  Button,
  DatePicker,
  message,
  RadioButton,
  RadioGroup,
  Select,
} from 'antdv-next';
import Decimal from 'decimal.js';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  fetchDailySeries,
  fetchEdgeDistribution,
  fetchMarketPerformance,
  getWeeklyReport,
} from '#/api/analytics';
import { $t } from '#/locales';
import {
  presetDays,
  toAnalyticsQueryParams,
  utcDayDrilldownQuery,
  utcPresetWindow,
  validateAnalyticsRange,
} from '#/shared/composables/use-analytics-window';
import { useSystemStore } from '#/store';

import { useMarketPerformanceColumns } from './modules/schemas';
import CumulativePnlChart from './modules/widgets/cumulative-pnl-chart.vue';
import DailyPnlBar from './modules/widgets/daily-pnl-bar.vue';
import EdgeDistributionChart from './modules/widgets/edge-distribution-chart.vue';
import WeeklySummaryCard from './modules/widgets/weekly-summary-card.vue';
import WinRateTrend from './modules/widgets/win-rate-trend.vue';

defineOptions({ name: 'AnalyticsPage' });

const RangePicker = DatePicker.RangePicker;
const router = useRouter();
const systemStore = useSystemStore();
const { handleRequest } = useRequestHandler();

const selectedPreset = ref<AnalyticsWindowPreset>('7d');
const dateRange = ref<UtcDayRange>(utcPresetWindow(7));
const executionMode = ref<ExecutionMode | undefined>(undefined);
const loading = ref(false);

const dailyPoints = ref<AnalyticsDailyPoint[]>([]);
const dailyError = ref<null | string>(null);
const edgeBuckets = ref<EdgeBucket[]>([]);
const edgeError = ref<null | string>(null);
const weeklyReport = ref<null | WeeklyReport>(null);
const weeklyError = ref<null | string>(null);

const queryParams = computed<AnalyticsQueryParams>(() =>
  toAnalyticsQueryParams(dateRange.value, executionMode.value),
);

const modeOptions = computed(() =>
  Object.values(EXECUTION_MODES).map((value) => ({
    label: $t(`enum.executionMode.${value}`),
    value,
  })),
);

function toGridRows(items: MarketPerformanceRow[]): MarketPerformanceGridRow[] {
  return items.map((row) => {
    const successRate =
      row.trade_count === 0
        ? '0'
        : new Decimal(row.success_count).div(row.trade_count).toString();
    return { ...row, success_rate: successRate };
  });
}

function emptyPerformancePage(
  page: number,
  size: number,
): Paginated<MarketPerformanceGridRow> {
  return { has_next: false, items: [], page, size, total: 0 };
}

async function loadDailySeries() {
  dailyError.value = null;
  const series = await handleRequest(
    () => fetchDailySeries(queryParams.value),
    {
      onError: (error) => {
        dailyError.value = error.message;
      },
    },
  );
  dailyPoints.value = series?.points ?? [];
}

async function loadEdgeDistribution() {
  edgeError.value = null;
  const buckets = await handleRequest(
    () => fetchEdgeDistribution(queryParams.value),
    {
      onError: (error) => {
        edgeError.value = error.message;
      },
    },
  );
  edgeBuckets.value = buckets ?? [];
}

async function loadWeeklyReport() {
  weeklyError.value = null;
  const report = await handleRequest(getWeeklyReport, {
    onError: (error) => {
      weeklyError.value = error.message;
    },
  });
  weeklyReport.value = report;
}

async function refreshCharts() {
  loading.value = true;
  try {
    await Promise.all([
      loadDailySeries(),
      loadWeeklyReport(),
      loadEdgeDistribution(),
    ]);
  } finally {
    loading.value = false;
  }
}

const [Grid, gridApi] = useVbenVxeGrid<MarketPerformanceGridRow>({
  gridOptions: {
    columns: useMarketPerformanceColumns(),
    proxyConfig: {
      ajax: {
        query: async ({
          page,
        }: {
          page: { currentPage: number; pageSize: number };
        }) => {
          let result = emptyPerformancePage(page.currentPage, page.pageSize);
          await handleRequest(
            () =>
              fetchMarketPerformance({
                ...queryParams.value,
                page: page.currentPage,
                size: page.pageSize,
              }),
            {
              onSuccess: (data) => {
                result = { ...data, items: toGridRows(data.items) };
              },
              onError: (error) => {
                message.error(error.message);
              },
            },
          );
          return result;
        },
      },
    },
    rowConfig: { keyField: 'market_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

async function refreshAll() {
  const validationError = validateAnalyticsRange(dateRange.value);
  if (validationError) {
    message.error(validationError);
    return;
  }
  await Promise.all([refreshCharts(), gridApi.query()]);
}

async function applyPreset(value: AnalyticsWindowPreset) {
  if (value === 'custom') {
    return;
  }
  selectedPreset.value = value;
  dateRange.value = utcPresetWindow(presetDays(value));
  await refreshAll();
}

async function onRangeChange() {
  selectedPreset.value = 'custom';
  await refreshAll();
}

function onDailyDrilldown(date: IsoDate) {
  const query = {
    ...utcDayDrilldownQuery(date),
    ...(executionMode.value ? { execution_mode: executionMode.value } : {}),
  };
  void router.push({ path: '/trades', query });
}

watch(
  () => systemStore.status?.execution_mode,
  (mode) => {
    if (mode && executionMode.value === undefined) {
      executionMode.value = mode;
    }
  },
  { immediate: true },
);

onMounted(() => {
  executionMode.value ??= systemStore.status?.execution_mode;
  void refreshAll();
});
</script>

<template>
  <Page auto-content-height>
    <div class="flex flex-col gap-4">
      <div
        class="bg-card border-border flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div class="flex flex-wrap items-center gap-3">
          <RadioGroup
            :value="selectedPreset"
            button-style="solid"
            @change="(event: any) => applyPreset(event.target.value)"
          >
            <RadioButton value="7d">7D</RadioButton>
            <RadioButton value="30d">30D</RadioButton>
            <RadioButton value="90d">90D</RadioButton>
          </RadioGroup>
          <RangePicker
            v-model:value="dateRange"
            :allow-clear="false"
            show-time
            @change="onRangeChange"
          />
          <Select
            v-model:value="executionMode"
            allow-clear
            class="min-w-36"
            :options="modeOptions"
            :placeholder="$t('page.analytics.filters.executionMode')"
            @change="refreshAll"
          />
        </div>
        <Button :loading="loading" type="primary" @click="refreshAll">
          {{ $t('page.analytics.actions.refresh') }}
        </Button>
      </div>

      <WeeklySummaryCard
        :error="weeklyError"
        :loading="loading"
        :report="weeklyReport"
      />

      <div class="grid gap-4 xl:grid-cols-2">
        <CumulativePnlChart
          :error="dailyError"
          :loading="loading"
          :points="dailyPoints"
        />
        <DailyPnlBar
          :error="dailyError"
          :loading="loading"
          :points="dailyPoints"
          @drilldown="onDailyDrilldown"
        />
        <EdgeDistributionChart
          :buckets="edgeBuckets"
          :error="edgeError"
          :loading="loading"
        />
        <WinRateTrend
          :error="dailyError"
          :loading="loading"
          :points="dailyPoints"
        />
      </div>

      <Grid
        :table-title="$t('page.analytics.marketPerformance.title')"
        :table-title-help="$t('page.analytics.basis.execution')"
      />
    </div>
  </Page>
</template>
