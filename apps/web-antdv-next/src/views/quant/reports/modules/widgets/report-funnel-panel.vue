<script lang="ts" setup>
import type {
  QuantReportFunnelView,
  ReportFunnelMarketView,
  ReportFunnelReason,
  ReportFunnelStage,
} from '@vben/types';

import { computed, onMounted, ref, watch } from 'vue';

import { useRequestHandler } from '@vben/request/qp';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  Select,
  Space,
  Table,
  Tag,
} from 'antdv-next';

import {
  getQuantReportFunnel,
  listQuantReportFunnelMarkets,
} from '#/api/quant-reports';
import { $t } from '#/locales';

defineOptions({ name: 'ReportFunnelPanel' });

const props = defineProps<{ reportId: string }>();
const { handleRequest } = useRequestHandler();

const summary = ref<null | QuantReportFunnelView>(null);
const rows = ref<ReportFunnelMarketView[]>([]);
const total = ref(0);
const page = ref(1);
const size = ref(50);
const stage = ref<ReportFunnelStage>();
const reason = ref<ReportFunnelReason>();
const selected = ref<null | ReportFunnelMarketView>(null);
const loading = ref(false);

const REASONS: ReportFunnelReason[] = [
  'not_open',
  'category_disabled',
  'resolution_ambiguous',
  'manually_blocked',
  'insufficient_liquidity',
  'spread_too_wide',
  'stale_book',
  'ingest_lag_exceeded',
  'model_feature_unavailable',
  'feature_data_quality_rejected',
  'missing_model_output',
  'score_below_floor',
  'low_confidence',
  'no_positive_signal',
  'invalid_edge_inputs',
  'return_model_uncalibrated',
  'trade_policy_unavailable',
  'below_min_size',
  'liquidity_infeasible',
  'budget_exhausted',
  'market_cap_exhausted',
  'event_cap_exhausted',
  'category_cap_exhausted',
  'correlation_cap_exhausted',
  'available_cash_exhausted',
  'aggregate_exposure_cap_exhausted',
  'beyond_top_n',
  'system_degraded',
  'published',
];

const stageOptions = computed(() =>
  (summary.value?.stages ?? []).map((item) => ({
    label: $t(`enum.reportFunnelStage.${item.stage}`),
    value: item.stage,
  })),
);

const reasonOptions = REASONS.map((value) => ({
  label: $t(`enum.reportFunnelReason.${value}`),
  value,
}));

const columns = computed(() => [
  {
    dataIndex: 'market_id',
    ellipsis: true,
    key: 'market_id',
    title: $t('page.quantReports.funnel.columns.market'),
    width: 180,
  },
  {
    dataIndex: 'terminal_stage',
    key: 'terminal_stage',
    title: $t('page.quantReports.funnel.columns.stage'),
    width: 180,
  },
  {
    dataIndex: 'primary_reason',
    key: 'primary_reason',
    title: $t('page.quantReports.funnel.columns.reason'),
    width: 220,
  },
  {
    dataIndex: 'primary_token_id',
    ellipsis: true,
    key: 'primary_token_id',
    title: $t('page.quantReports.funnel.columns.primaryToken'),
    width: 180,
  },
  {
    key: 'lineage',
    title: $t('page.quantReports.funnel.columns.lineage'),
    width: 100,
  },
]);

async function loadSummary() {
  summary.value =
    (await handleRequest(() => getQuantReportFunnel(props.reportId), {
      silent: true,
    })) ?? null;
}

async function loadRows() {
  loading.value = true;
  try {
    const result = await handleRequest(
      () =>
        listQuantReportFunnelMarkets(props.reportId, {
          page: page.value,
          primary_reason: reason.value,
          size: size.value,
          terminal_stage: stage.value,
        }),
      { silent: true },
    );
    rows.value = result?.items ?? [];
    total.value = result?.total ?? 0;
    if (
      selected.value &&
      !rows.value.some((row) => row.row_hash === selected.value?.row_hash)
    ) {
      selected.value = null;
    }
  } finally {
    loading.value = false;
  }
}

function changePage(next: number, nextSize: number) {
  page.value = next;
  size.value = nextSize;
}

function resetFilters() {
  stage.value = undefined;
  reason.value = undefined;
}

watch([stage, reason], () => {
  page.value = 1;
  void loadRows();
});
watch([page, size], () => void loadRows());
watch(
  () => props.reportId,
  () => {
    void Promise.all([loadSummary(), loadRows()]);
  },
);

onMounted(() => void Promise.all([loadSummary(), loadRows()]));
</script>

<template>
  <div aria-live="polite" class="funnel-panel" data-testid="report-funnel">
    <Alert
      v-if="summary"
      :description="
        $t('page.quantReports.funnel.conservationDetail', {
          catalog: summary.catalog_visible_count,
          published: summary.published_count,
        })
      "
      :message="
        summary.conserved
          ? $t('page.quantReports.funnel.conserved')
          : $t('page.quantReports.funnel.violated')
      "
      show-icon
      :type="summary.conserved ? 'success' : 'error'"
    />

    <div v-if="summary" class="stage-grid">
      <Card v-for="item in summary.stages" :key="item.stage" size="small">
        <strong>{{ $t(`enum.reportFunnelStage.${item.stage}`) }}</strong>
        <div class="stage-counts">
          <span>
            {{ $t('page.quantReports.funnel.input') }} {{ item.input_count }}
          </span>
          <span>
            {{ $t('page.quantReports.funnel.output') }} {{ item.output_count }}
          </span>
          <span>
            {{ $t('page.quantReports.funnel.excluded') }}
            {{ item.excluded_count }}
          </span>
        </div>
      </Card>
    </div>

    <Card :title="$t('page.quantReports.funnel.marketDecisions')">
      <Space class="filters" wrap>
        <Select
          v-model:value="stage"
          allow-clear
          :options="stageOptions"
          :placeholder="$t('page.quantReports.funnel.filterStage')"
        />
        <Select
          v-model:value="reason"
          allow-clear
          :options="reasonOptions"
          :placeholder="$t('page.quantReports.funnel.filterReason')"
          show-search
        />
        <Button @click="resetFilters">{{ $t('common.reset') }}</Button>
      </Space>

      <Table
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        data-testid="report-funnel-markets"
        :pagination="{
          current: page,
          pageSize: size,
          showSizeChanger: true,
          total,
        }"
        row-key="row_hash"
        :scroll="{ x: 860 }"
        @change="
          (pagination) =>
            changePage(pagination.current ?? 1, pagination.pageSize ?? 50)
        "
      >
        <template #bodyCell="{ column, record }">
          <Tag v-if="column.key === 'terminal_stage'">
            {{ $t(`enum.reportFunnelStage.${record.terminal_stage}`) }}
          </Tag>
          <span v-else-if="column.key === 'primary_reason'">
            {{ $t(`enum.reportFunnelReason.${record.primary_reason}`) }}
          </span>
          <Button
            v-else-if="column.key === 'lineage'"
            size="small"
            @click="selected = record"
          >
            {{ $t('common.detail') }}
          </Button>
        </template>
      </Table>
    </Card>

    <Card
      v-if="selected"
      :title="$t('page.quantReports.funnel.lineageTitle')"
      data-testid="report-funnel-lineage"
    >
      <Descriptions :column="1" bordered size="small">
        <DescriptionsItem label="MarketSelectionId">
          <span class="mono">{{ selected.market_selection_id }}</span>
        </DescriptionsItem>
        <DescriptionsItem label="FeatureVectorId">
          <span class="mono">{{ selected.feature_vector_id ?? '—' }}</span>
        </DescriptionsItem>
        <DescriptionsItem label="SignalCandidateId">
          <span class="mono">{{ selected.signal_candidate_id ?? '—' }}</span>
        </DescriptionsItem>
        <DescriptionsItem label="RecommendationId">
          <span class="mono">{{ selected.recommendation_id ?? '—' }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.funnel.profile')">
          {{ selected.profile_ref.id }}@{{ selected.profile_ref.version }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.funnel.rowHash')">
          <span class="mono">{{ selected.row_hash }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.funnel.diagnostics')">
          <pre>{{
            JSON.stringify(selected.secondary_diagnostics, null, 2)
          }}</pre>
        </DescriptionsItem>
      </Descriptions>
    </Card>
    <Empty v-else-if="!loading && rows.length === 0" />
  </div>
</template>

<style scoped>
.funnel-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.stage-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.stage-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
}

.filters {
  margin-bottom: 16px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  overflow-wrap: anywhere;
}

pre {
  max-height: 280px;
  margin: 0;
  overflow: auto;
  white-space: pre-wrap;
}

@media (max-width: 900px) {
  .stage-grid {
    grid-template-columns: 1fr;
  }
}
</style>
