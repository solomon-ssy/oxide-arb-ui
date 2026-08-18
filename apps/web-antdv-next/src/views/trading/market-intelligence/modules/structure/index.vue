<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';
import type {
  ExecutionHistoryCoverageView,
  NegRiskEventDriftView,
  ParticipantConcentrationDetailView,
  ParticipantConcentrationMarketView,
  ParticipantConcentrationSummaryView,
} from '@vben/types';

import { computed, ref, watch } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { useRequestHandler } from '@vben/request/qp';

import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  Statistic,
  Table,
  TabPane,
  Tabs,
  Tag,
} from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getExecutionHistoryCoverage,
  getParticipantConcentration,
  getParticipantConcentrationMarket,
  listNegRiskEvents,
} from '#/api/vertical-alpha';
import { $t } from '#/locales';
import AsyncState from '#/shared/components/async-state.vue';
import ChartPanel from '#/shared/components/chart-panel.vue';
import {
  formatDateTimeLocal,
  formatPercent,
  formatUsd,
  parseDecimal,
} from '#/shared/components/format';
import WorkspaceInspectorSurface from '#/shared/components/workspace/workspace-inspector-surface.vue';
import { usePolling } from '#/shared/composables/use-polling';

defineOptions({ name: 'StructuralMonitorPage' });

const { handleRequest } = useRequestHandler();

const loading = ref(false);
const pollingEnabled = ref(true);
const coverage = ref<ExecutionHistoryCoverageView | null>(null);
const concentration = ref<null | ParticipantConcentrationSummaryView>(null);
const negRiskEvents = ref<NegRiskEventDriftView[]>([]);
const detailLoading = ref(false);
const detailError = ref<null | string>(null);
const detail = ref<null | ParticipantConcentrationDetailView>(null);

const chartRef = ref<EchartsUIType>();
const { renderEcharts, resize } = useEcharts(chartRef);

const DRIFT_ALERT = 0.05;

const topMarkets = computed(() => concentration.value?.markets ?? []);
const coverageHealth = computed(() => coverage.value?.source_health[0]);
const missingMarkets = computed(() =>
  coverage.value?.missing_reason_breakdown.reduce(
    (sum, row) => sum + row.count,
    0,
  ),
);

const marketGridPage = {
  has_next: false,
  items: [] as ParticipantConcentrationMarketView[],
  page: 1,
  size: 0,
  total: 0,
};

const [MarketGrid, marketGridApi] =
  useVbenVxeGrid<ParticipantConcentrationMarketView>({
    gridOptions: {
      columns: [
        {
          field: 'question',
          minWidth: 300,
          title: $t('page.structuralAlpha.grid.market'),
        },
        {
          field: 'trade_count',
          formatter: ({ cellValue }: { cellValue: null | number }) =>
            formatOptionalCount(cellValue),
          title: $t('page.structuralAlpha.grid.trades'),
          width: 100,
        },
        {
          field: 'participant_count',
          formatter: ({ cellValue }: { cellValue: null | number }) =>
            formatOptionalCount(cellValue),
          title: $t('page.structuralAlpha.grid.participants'),
          width: 130,
        },
        {
          field: 'notional_usd',
          formatter: ({ cellValue }: { cellValue: null | string }) =>
            formatUsd(cellValue),
          title: $t('page.structuralAlpha.grid.notional'),
          width: 130,
        },
        {
          field: 'coverage_ratio',
          formatter: ({ cellValue }: { cellValue: null | string }) =>
            formatPercent(cellValue, 1),
          title: $t('page.structuralAlpha.grid.coverageRatio'),
          width: 110,
        },
        {
          field: 'cr1_share',
          formatter: ({ cellValue }: { cellValue: null | string }) =>
            formatPercent(cellValue, 1),
          title: $t('page.structuralAlpha.grid.cr1Share'),
          width: 100,
        },
        {
          field: 'composite_raw',
          formatter: ({ cellValue }: { cellValue: null | string }) =>
            formatRatio(cellValue),
          title: $t('page.structuralAlpha.grid.composite'),
          width: 110,
        },
        {
          field: 'lag_blocks',
          formatter: ({ cellValue }: { cellValue: null | number }) =>
            formatLagBlocks(cellValue),
          title: $t('page.structuralAlpha.grid.lag'),
          width: 90,
        },
        {
          field: 'hhi',
          formatter: ({ cellValue }: { cellValue: null | string }) =>
            formatRatio(cellValue),
          title: $t('page.structuralAlpha.grid.hhi'),
          width: 100,
        },
        {
          field: 'gini',
          formatter: ({ cellValue }: { cellValue: null | string }) =>
            formatRatio(cellValue),
          title: $t('page.structuralAlpha.grid.gini'),
          width: 100,
        },
        {
          field: 'missing_reason',
          formatter: ({ cellValue }: { cellValue: null | string }) =>
            formatReason(cellValue),
          minWidth: 150,
          title: $t('page.structuralAlpha.grid.status'),
        },
      ],
      pagerConfig: { enabled: false },
      proxyConfig: {
        ajax: {
          query: async () => ({
            ...marketGridPage,
            items: topMarkets.value,
            size: topMarkets.value.length,
            total: topMarkets.value.length,
          }),
        },
      },
      rowConfig: { isHover: true, keyField: 'market_id' },
      toolbarConfig: { refresh: { code: 'query' } },
    },
  });

const participantColumns = [
  {
    dataIndex: 'participant_address',
    title: $t('page.structuralAlpha.detail.participant'),
  },
  {
    dataIndex: 'participant_role',
    title: $t('page.structuralAlpha.detail.role'),
  },
  {
    dataIndex: 'trade_count',
    title: $t('page.structuralAlpha.detail.trades'),
  },
  {
    dataIndex: 'notional_usd',
    title: $t('page.structuralAlpha.detail.notional'),
  },
  {
    dataIndex: 'share',
    title: $t('page.structuralAlpha.detail.share'),
  },
];

const legColumns = [
  { dataIndex: 'question', title: $t('page.structuralAlpha.negrisk.leg') },
  {
    dataIndex: 'best_ask',
    title: $t('page.structuralAlpha.negrisk.bestAsk'),
  },
];

function formatOptionalCount(value: null | number | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return String(value);
}

function formatOptionalSeconds(value: null | number | undefined): string {
  return value === null || value === undefined ? '—' : `${value}s`;
}

function formatRatio(value: null | string): string {
  const decimal = parseDecimal(value);
  return decimal === null ? '—' : decimal.toFixed(4);
}

function formatLagBlocks(blocks: null | number | undefined): string {
  if (blocks === null || blocks === undefined) {
    return '—';
  }
  return $t('page.structuralAlpha.lag.blocks', { n: blocks });
}

function formatReason(reason: null | string): string {
  if (!reason) {
    return $t('page.structuralAlpha.status.scored');
  }
  const key = `page.structuralAlpha.reason.${reason}`;
  const label = $t(key);
  return label === key ? reason : label;
}

function shortId(value: string): string {
  return value.length <= 14 ? value : `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function driftColor(drift: null | string): string {
  if (drift === null) {
    return 'default';
  }
  return Math.abs(Number(drift)) >= DRIFT_ALERT ? 'error' : 'success';
}

async function refresh() {
  if (loading.value) {
    return;
  }
  loading.value = true;
  try {
    const [coverageResult, concentrationResult, negRiskResult] =
      await Promise.all([
        handleRequest(() => getExecutionHistoryCoverage()),
        handleRequest(() => getParticipantConcentration()),
        handleRequest(() => listNegRiskEvents()),
      ]);
    coverage.value = coverageResult ?? null;
    concentration.value = concentrationResult ?? null;
    negRiskEvents.value = negRiskResult ?? [];
    await marketGridApi.query();
    renderConcentrationChart();
  } finally {
    loading.value = false;
  }
}

async function openMarketDetail(row: ParticipantConcentrationMarketView) {
  detailDrawerApi.setData({ row }).open();
}

async function loadMarketDetail(row: ParticipantConcentrationMarketView) {
  detailLoading.value = true;
  detailError.value = null;
  detail.value = null;
  try {
    const result = await handleRequest(
      () => getParticipantConcentrationMarket(row.market_id),
      {
        silent: true,
        onError: (err) => {
          if (err.httpStatus !== 404) {
            detailError.value = err.message;
          }
        },
      },
    );
    detail.value = result ?? null;
  } finally {
    detailLoading.value = false;
  }
}

const [, detailDrawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const row = detailDrawerApi.getData<{
        row: ParticipantConcentrationMarketView;
      }>().row;
      void loadMarketDetail(row);
    } else {
      detail.value = null;
      detailError.value = null;
    }
  },
});

function onMarketCellClick(event: {
  row?: ParticipantConcentrationMarketView;
}) {
  if (event.row) {
    void openMarketDetail(event.row);
  }
}

function chartMetricValue(value: null | string): '-' | number {
  const parsed = parseDecimal(value);
  return parsed === null ? '-' : parsed.toNumber();
}

function renderConcentrationChart() {
  const rows = topMarkets.value
    .filter((row) => !row.missing_reason)
    .slice(0, 12);
  void renderEcharts({
    grid: { bottom: 70, left: 48, right: 32, top: 28 },
    legend: {
      data: [
        $t('page.structuralAlpha.chart.cr1Share'),
        $t('page.structuralAlpha.chart.hhi'),
        $t('page.structuralAlpha.chart.gini'),
      ],
    },
    tooltip: { trigger: 'axis' },
    xAxis: {
      axisLabel: { interval: 0, rotate: 35 },
      data: rows.map((row) => shortId(row.market_id)),
      type: 'category',
    },
    yAxis: {
      max: 1,
      min: 0,
      type: 'value',
    },
    series: [
      {
        data: rows.map((row) => chartMetricValue(row.cr1_share)),
        name: $t('page.structuralAlpha.chart.cr1Share'),
        type: 'bar',
      },
      {
        data: rows.map((row) => chartMetricValue(row.hhi)),
        name: $t('page.structuralAlpha.chart.hhi'),
        type: 'bar',
      },
      {
        data: rows.map((row) => chartMetricValue(row.gini)),
        name: $t('page.structuralAlpha.chart.gini'),
        type: 'bar',
      },
    ],
  });
}

usePolling(refresh, {
  enabled: pollingEnabled,
  immediate: true,
  intervalMs: 60_000,
});

watch(topMarkets, () => {
  void marketGridApi.query();
  renderConcentrationChart();
});
</script>

<template>
  <Page auto-content-height>
    <template #title>{{ $t('page.structuralAlpha.title') }}</template>
    <template #description>{{ $t('page.structuralAlpha.subtitle') }}</template>
    <template #extra>
      <Button :loading="loading" size="small" @click="refresh">
        {{ $t('page.structuralAlpha.refresh') }}
      </Button>
    </template>

    <div class="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Card size="small">
        <Statistic
          :title="$t('page.structuralAlpha.kpi.coverage')"
          :value="formatPercent(coverage?.covered_market_ratio, 1)"
        />
      </Card>
      <Card size="small">
        <Statistic
          :title="$t('page.structuralAlpha.kpi.activeMarkets')"
          :value="coverage?.active_market_count ?? 0"
        />
      </Card>
      <Card size="small">
        <Statistic
          :title="$t('page.structuralAlpha.kpi.acceptedThroughBlock')"
          :value="formatOptionalCount(coverageHealth?.accepted_through_block)"
        />
      </Card>
      <Card size="small">
        <Statistic
          :title="$t('page.structuralAlpha.kpi.missingMarkets')"
          :value="missingMarkets ?? 0"
        />
      </Card>
    </div>

    <Tabs>
      <TabPane
        key="concentration"
        :tab="$t('page.structuralAlpha.tabs.concentration')"
      >
        <div v-if="concentration" class="text-muted-foreground mb-3 text-xs">
          {{ $t('page.structuralAlpha.thresholds.minParticipants') }}:
          {{ concentration.min_unique_participants }} ·
          {{ $t('page.structuralAlpha.thresholds.minNotional') }}:
          {{ formatUsd(concentration.min_notional_usd) }} ·
          {{ $t('page.structuralAlpha.thresholds.minCoverage') }}:
          {{ formatPercent(concentration.min_coverage_ratio, 0) }}
        </div>

        <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <ChartPanel
            :empty="
              topMarkets.filter((row) => !row.missing_reason).length === 0
            "
            :loading="loading"
            :title="$t('page.structuralAlpha.chart.title')"
            icon="lucide:bar-chart-3"
            @resize="resize"
          >
            <EchartsUI ref="chartRef" height="320px" />
          </ChartPanel>

          <Card size="small" :title="$t('page.structuralAlpha.coverage.title')">
            <Descriptions bordered size="small" :column="1">
              <DescriptionsItem
                :label="$t('page.structuralAlpha.coverage.extractor')"
              >
                {{ coverageHealth?.extractor ?? '—' }}
                <Tag
                  v-if="typeof coverageHealth?.enabled === 'boolean'"
                  :color="coverageHealth.enabled ? 'success' : 'default'"
                >
                  {{
                    coverageHealth.enabled
                      ? $t('page.structuralAlpha.coverage.enabled')
                      : $t('page.structuralAlpha.coverage.disabled')
                  }}
                </Tag>
                <span v-else>—</span>
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.structuralAlpha.coverage.attestor')"
              >
                {{ coverageHealth?.attestor ?? '—' }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.structuralAlpha.coverage.state')"
              >
                {{ coverageHealth?.state ?? '—' }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="
                  $t('page.structuralAlpha.coverage.acceptedThroughBlock')
                "
              >
                {{
                  formatOptionalCount(coverageHealth?.accepted_through_block)
                }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.structuralAlpha.coverage.effectiveThroughAt')"
              >
                {{ formatDateTimeLocal(coverageHealth?.effective_through_at) }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.structuralAlpha.coverage.quarantineCount')"
              >
                {{ formatOptionalCount(coverageHealth?.quarantine_count) }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.structuralAlpha.coverage.window')"
              >
                {{ formatOptionalSeconds(coverage?.window_secs) }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.structuralAlpha.coverage.delay')"
              >
                {{ formatOptionalSeconds(coverage?.knowledge_lag_secs) }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.structuralAlpha.coverage.decisionAt')"
              >
                {{ formatDateTimeLocal(coverage?.decision_at) }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.structuralAlpha.coverage.knowledgeCutoff')"
              >
                {{ formatDateTimeLocal(coverage?.knowledge_cutoff) }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.structuralAlpha.coverage.updatedAt')"
              >
                {{ formatDateTimeLocal(coverageHealth?.last_updated_at) }}
              </DescriptionsItem>
            </Descriptions>
          </Card>
        </div>

        <div class="mt-4">
          <MarketGrid
            :table-title="$t('page.structuralAlpha.grid.title')"
            @cell-click="onMarketCellClick"
          />
        </div>
      </TabPane>

      <TabPane key="negrisk" :tab="$t('page.structuralAlpha.tabs.negrisk')">
        <Empty
          v-if="negRiskEvents.length === 0"
          :description="$t('page.structuralAlpha.negrisk.empty')"
        />
        <div v-else class="flex flex-col gap-4">
          <Card
            v-for="event in negRiskEvents"
            :key="event.event_id"
            size="small"
          >
            <template #title>
              <div class="flex flex-wrap items-center gap-2">
                <span>{{ event.title }}</span>
                <Tag :color="driftColor(event.drift)">
                  {{ $t('page.structuralAlpha.negrisk.askSum') }}
                  {{ event.ask_sum ?? '—' }}
                  <template v-if="event.drift !== null">
                    ({{ $t('page.structuralAlpha.negrisk.drift') }}
                    {{ event.drift }})
                  </template>
                </Tag>
                <span class="text-muted-foreground text-xs">
                  {{ event.leg_count }}
                  {{ $t('page.structuralAlpha.negrisk.legs') }} ·
                  {{ formatDateTimeLocal(event.computed_at) }}
                </span>
              </div>
            </template>
            <Table
              :columns="legColumns"
              :data-source="event.legs"
              :pagination="false"
              row-key="yes_token_id"
              size="small"
            />
          </Card>
        </div>
      </TabPane>
    </Tabs>

    <WorkspaceInspectorSurface
      :drawer-api="detailDrawerApi"
      :title="$t('page.structuralAlpha.detail.title')"
    >
      <AsyncState
        :error-message="detailError"
        :loading="detailLoading"
        :not-found="!detail && !detailLoading && !detailError"
        :not-found-text="$t('page.structuralAlpha.detail.empty')"
        @retry="
          () => {
            const row = detailDrawerApi.getData<{
              row: ParticipantConcentrationMarketView;
            }>()?.row;
            if (row) {
              void loadMarketDetail(row);
            }
          }
        "
      >
        <Descriptions bordered size="small" :column="1" class="mb-4">
          <DescriptionsItem :label="$t('page.structuralAlpha.grid.market')">
            {{ detail!.market.question }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('page.structuralAlpha.detail.marketId')">
            {{ detail!.market.market_id }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('page.structuralAlpha.grid.trades')">
            {{ formatOptionalCount(detail!.market.trade_count) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.structuralAlpha.grid.participants')"
          >
            {{ formatOptionalCount(detail!.market.participant_count) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.structuralAlpha.grid.coverageRatio')"
          >
            {{ formatPercent(detail!.market.coverage_ratio, 1) }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('page.structuralAlpha.grid.gini')">
            {{ formatRatio(detail!.market.gini) }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('page.structuralAlpha.grid.hhi')">
            {{ formatRatio(detail!.market.hhi) }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('page.structuralAlpha.grid.cr1Share')">
            {{ formatPercent(detail!.market.cr1_share, 1) }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('page.structuralAlpha.grid.composite')">
            {{ formatRatio(detail!.market.composite_raw) }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('page.structuralAlpha.grid.lag')">
            {{ formatLagBlocks(detail!.market.lag_blocks) }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('page.structuralAlpha.grid.notional')">
            {{ formatUsd(detail!.market.notional_usd) }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('page.structuralAlpha.grid.status')">
            {{ formatReason(detail!.market.missing_reason) }}
          </DescriptionsItem>
        </Descriptions>
        <Table
          :columns="participantColumns"
          :data-source="detail!.top_participants"
          :pagination="false"
          row-key="participant_address"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'participant_address'">
              {{ shortId(record.participant_address) }}
            </template>
            <template v-else-if="column.dataIndex === 'notional_usd'">
              {{ formatUsd(record.notional_usd) }}
            </template>
            <template v-else-if="column.dataIndex === 'share'">
              {{ formatPercent(record.share, 1) }}
            </template>
          </template>
        </Table>
      </AsyncState>
    </WorkspaceInspectorSurface>
  </Page>
</template>
