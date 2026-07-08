<script lang="ts" setup>
import type {
  BacktestReportView,
  ModelComparisonReportView,
} from '@vben/types';

import type { DecimalSign } from '#/shared/components/format';

import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import {
  Alert,
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  message,
  Spin,
  Table,
} from 'antdv-next';

import { getBacktestReport, getComparisonReport } from '#/api/research';
import { $t } from '#/locales';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import {
  decimalSign,
  formatDateTimeLocal,
  formatPercent,
  formatScore,
  formatUsd,
  parseDecimal,
} from '#/shared/components/format';
import SignedValue from '#/shared/components/signed-value.vue';
import StatCard from '#/shared/components/stat-card.vue';

import CategoryDiffTable from './modules/category-diff-table.vue';

defineOptions({ name: 'ResearchComparisonDetailPage' });

const route = useRoute();
const { handleRequest } = useRequestHandler();

const report = ref<ModelComparisonReportView | null>(null);
const candidateReport = ref<BacktestReportView | null>(null);
const baselineReport = ref<BacktestReportView | null>(null);
const loading = ref(false);

const categoryDiff = computed(
  () => report.value?.category_breakdown_diff ?? [],
);

// Verdict: rank-IC delta leads, realized-PnL delta corroborates.
const verdict = computed(() => {
  const current = report.value;
  if (!current) {
    return null;
  }
  const rank = decimalSign(current.rank_ic_delta) ?? 0;
  const pnl = decimalSign(current.realized_pnl_delta) ?? 0;
  if (rank > 0 && pnl >= 0) {
    return {
      message: $t('page.research.comparisons.detail.verdict.improved'),
      type: 'success' as const,
    };
  }
  if (rank < 0 && pnl <= 0) {
    return {
      message: $t('page.research.comparisons.detail.verdict.regressed'),
      type: 'warning' as const,
    };
  }
  return {
    message: $t('page.research.comparisons.detail.verdict.mixed'),
    type: 'info' as const,
  };
});

interface HeadlineCard {
  key: string;
  sign: DecimalSign | null;
  title: string;
  value: string;
}

const headlineCards = computed<HeadlineCard[]>(() => {
  const current = report.value;
  if (!current) {
    return [];
  }
  return [
    {
      key: 'rank_ic_delta',
      sign: decimalSign(current.rank_ic_delta),
      title: $t('page.research.comparisons.detail.rankIcDelta'),
      value: formatScore(current.rank_ic_delta),
    },
    {
      key: 'hit_rate_delta',
      sign: decimalSign(current.hit_rate_delta),
      title: $t('page.research.comparisons.detail.hitRateDelta'),
      value: formatScore(current.hit_rate_delta),
    },
    {
      key: 'realized_pnl_delta',
      sign: decimalSign(current.realized_pnl_delta),
      title: $t('page.research.comparisons.detail.realizedPnlDelta'),
      value: formatUsd(current.realized_pnl_delta),
    },
    {
      key: 'score_correlation',
      sign: null,
      title: $t('page.research.comparisons.detail.scoreCorrelation'),
      value: formatScore(current.score_correlation),
    },
    {
      key: 'side_disagreement_rate',
      sign: null,
      title: $t('page.research.comparisons.detail.sideDisagreement'),
      value: formatPercent(current.side_disagreement_rate),
    },
    {
      key: 'common_samples',
      sign: null,
      title: $t('page.research.comparisons.detail.commonSamples'),
      value: String(current.common_samples),
    },
  ];
});

type MetricFormat = 'percent' | 'score';

interface MetricRow {
  baseline: string;
  candidate: string;
  delta: string;
  deltaSign: DecimalSign | null;
  key: string;
  metric: string;
}

function diffString(candidate: string, baseline: string): null | string {
  const a = parseDecimal(candidate);
  const b = parseDecimal(baseline);
  if (a === null || b === null) {
    return null;
  }
  return a.sub(b).toString();
}

function metricRow(
  key: string,
  labelKey: string,
  format: MetricFormat,
  pick: (report: BacktestReportView) => string,
): MetricRow {
  const candidate = candidateReport.value;
  const baseline = baselineReport.value;
  const cv = candidate ? pick(candidate) : '';
  const bv = baseline ? pick(baseline) : '';
  const raw = diffString(cv, bv);
  const render = format === 'percent' ? formatPercent : formatScore;
  return {
    baseline: render(bv),
    candidate: render(cv),
    delta: raw === null ? '—' : render(raw),
    deltaSign: raw === null ? null : decimalSign(raw),
    key,
    metric: $t(labelKey),
  };
}

const metricRows = computed<MetricRow[]>(() => {
  if (!candidateReport.value || !baselineReport.value) {
    return [];
  }
  return [
    metricRow(
      'rank_ic',
      'page.research.backtests.columns.rankIc',
      'score',
      (report) => report.rank_ic,
    ),
    metricRow(
      'hit_rate',
      'page.research.backtests.columns.hitRate',
      'percent',
      (report) => report.hit_rate,
    ),
    metricRow(
      'coverage',
      'page.research.backtests.columns.coverage',
      'percent',
      (report) => report.coverage,
    ),
    metricRow(
      'max_drawdown',
      'page.research.backtests.detail.maxDrawdown',
      'percent',
      (report) => report.max_drawdown,
    ),
    metricRow(
      'turnover',
      'page.research.backtests.detail.turnover',
      'score',
      (report) => report.turnover,
    ),
    metricRow(
      'tail_loss',
      'page.research.backtests.detail.tailLoss',
      'score',
      (report) => report.tail_loss,
    ),
    metricRow(
      'liquidity_feasibility',
      'page.research.backtests.detail.liquidityFeasibility',
      'percent',
      (report) => report.liquidity_feasibility,
    ),
  ];
});

const metricColumns = computed(() => [
  {
    dataIndex: 'metric',
    key: 'metric',
    title: $t('page.research.comparisons.detail.sideBySide.metric'),
  },
  {
    align: 'right' as const,
    dataIndex: 'baseline',
    key: 'baseline',
    title: $t('page.research.comparisons.detail.sideBySide.baseline'),
  },
  {
    align: 'right' as const,
    dataIndex: 'candidate',
    key: 'candidate',
    title: $t('page.research.comparisons.detail.sideBySide.candidate'),
  },
  {
    align: 'right' as const,
    dataIndex: 'delta',
    key: 'delta',
    title: $t('page.research.comparisons.detail.sideBySide.delta'),
  },
]);

async function loadReport(id: string) {
  // Clear stale content while the next report loads (route param can change
  // without a remount when navigating between comparison deep links).
  report.value = null;
  candidateReport.value = null;
  baselineReport.value = null;
  loading.value = true;
  try {
    const loaded = await handleRequest(() => getComparisonReport(id), {
      silent: true,
    });
    report.value = loaded ?? null;
    if (!loaded) {
      message.error($t('page.common.deepLinkNotFound'));
      return;
    }
    // Pull both frozen reports for the absolute side-by-side comparison.
    const [candidate, baseline] = await Promise.all([
      handleRequest(() => getBacktestReport(loaded.candidate_report_id), {
        silent: true,
      }),
      handleRequest(() => getBacktestReport(loaded.baseline_report_id), {
        silent: true,
      }),
    ]);
    if (report.value?.comparison_report_id === id) {
      candidateReport.value = candidate ?? null;
      baselineReport.value = baseline ?? null;
    }
  } finally {
    loading.value = false;
  }
}

watch(
  () => route.params.id,
  (id) => {
    if (typeof id === 'string' && id) {
      void loadReport(id);
    }
  },
  { immediate: true },
);
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading">
      <div v-if="report" class="flex flex-col gap-4">
        <Alert
          v-if="verdict"
          :message="verdict.message"
          :type="verdict.type"
          show-icon
        />

        <div class="grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard
            v-for="card in headlineCards"
            :key="card.key"
            :sign="card.sign"
            :title="card.title"
            :value="card.value"
          />
        </div>

        <Card
          size="small"
          :title="$t('page.research.comparisons.detail.summary')"
        >
          <Descriptions :column="2" bordered size="small">
            <DescriptionsItem
              :label="$t('page.research.comparisons.detail.candidate')"
            >
              <EntityRouteLink
                mono
                :label="report.candidate_model_version_id"
                :to="`/research/models?open=${report.candidate_model_version_id}`"
              />
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.comparisons.detail.baseline')"
            >
              <EntityRouteLink
                mono
                :label="report.baseline_model_version_id"
                :to="`/research/models?open=${report.baseline_model_version_id}`"
              />
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.comparisons.detail.candidateReport')"
            >
              <EntityRouteLink
                mono
                :label="report.candidate_report_id"
                :to="`/research/backtests?open=${report.candidate_report_id}`"
              />
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.comparisons.detail.baselineReport')"
            >
              <EntityRouteLink
                mono
                :label="report.baseline_report_id"
                :to="`/research/backtests?open=${report.baseline_report_id}`"
              />
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.comparisons.detail.createdAt')"
            >
              {{ formatDateTimeLocal(report.created_at) }}
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card
          size="small"
          :title="$t('page.research.comparisons.detail.sideBySide.title')"
        >
          <Table
            v-if="metricRows.length > 0"
            :columns="metricColumns"
            :data-source="metricRows"
            :pagination="false"
            row-key="key"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'delta'">
                <SignedValue :sign="record.deltaSign" :value="record.delta" />
              </template>
              <template v-else-if="column.key === 'candidate'">
                <span class="font-mono">{{ record.candidate }}</span>
              </template>
              <template v-else-if="column.key === 'baseline'">
                <span class="font-mono">{{ record.baseline }}</span>
              </template>
              <template v-else>
                {{ record.metric }}
              </template>
            </template>
          </Table>
          <Empty
            v-else
            :description="
              $t('page.research.comparisons.detail.sideBySide.empty')
            "
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </Card>

        <Card
          size="small"
          :title="$t('page.research.comparisons.detail.categoryDiff')"
        >
          <CategoryDiffTable :value="categoryDiff" />
        </Card>
      </div>
      <Empty
        v-else-if="!loading"
        :description="$t('page.research.comparisons.detail.notFound')"
      />
    </Spin>
  </Page>
</template>
