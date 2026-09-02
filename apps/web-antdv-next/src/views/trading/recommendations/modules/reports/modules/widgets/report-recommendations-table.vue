<script lang="ts" setup>
import type { QuantRecommendationView } from '@vben/types';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import { Button, Empty, Select, Table, Tag, Tooltip } from 'antdv-next';

import { $t } from '#/locales';
import EnumTag from '#/shared/components/enum-tag.vue';
import { formatBps, formatScore, formatUsd } from '#/shared/components/format';
import { vAccessibleTableScroll } from '#/shared/directives/accessible-table-scroll';
import { centerTableColumns } from '#/shared/table/center-columns';

defineOptions({ name: 'ReportRecommendationsTable' });

const props = defineProps<{ recommendations: QuantRecommendationView[] }>();

const emit = defineEmits<{
  select: [recommendation: QuantRecommendationView];
}>();

const router = useRouter();
const routeFilter = ref<string>();

const routeOptions = computed(() =>
  [...new Set(props.recommendations.map((item) => item.route))].map(
    (value) => ({
      label: $t(`page.quantReports.routes.${value}`),
      value,
    }),
  ),
);
const visibleRecommendations = computed(() =>
  routeFilter.value
    ? props.recommendations.filter((item) => item.route === routeFilter.value)
    : props.recommendations,
);

function openFullPage(id: string) {
  void router.push(
    `/trading/recommendations?module=queue&entity=recommendation&id=${id}`,
  );
}

function rowProps(record: QuantRecommendationView) {
  return {
    class: 'cursor-pointer',
    role: 'button',
    tabindex: 0,
    onClick: () => emit('select', record),
    onKeydown: (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        emit('select', record);
      }
    },
  };
}

const columns = [
  {
    dataIndex: 'route',
    key: 'route',
    title: $t('page.quantReports.detail.recommendations.columns.route'),
    width: 110,
  },
  {
    dataIndex: 'rank',
    key: 'rank',
    title: $t('page.quantReports.detail.recommendations.columns.rank'),
    width: 80,
  },
  {
    dataIndex: ['identity', 'question'],
    key: 'market',
    title: $t('page.quantReports.detail.recommendations.columns.market'),
  },
  {
    dataIndex: 'outcome_side',
    key: 'outcome_side',
    title: $t('page.quantReports.detail.recommendations.columns.side'),
    width: 90,
  },
  {
    key: 'profit_probability',
    title: $t(
      'page.quantReports.detail.recommendations.columns.profitProbability',
    ),
    width: 130,
  },
  {
    key: 'robust_net',
    title: $t('page.quantReports.detail.recommendations.columns.robustNet'),
    width: 130,
  },
  {
    key: 'nominal_net',
    title: $t('page.quantReports.detail.recommendations.columns.nominalNet'),
    width: 130,
  },
  {
    key: 'marginal_value',
    title: $t('page.quantReports.detail.recommendations.columns.marginalValue'),
    width: 140,
  },
  {
    key: 'max_loss',
    title: $t('page.quantReports.detail.recommendations.columns.maxLoss'),
    width: 120,
  },
  {
    key: 'cvar',
    title: $t('page.quantReports.detail.recommendations.columns.cvar'),
    width: 120,
  },
  {
    key: 'capital_time',
    title: $t('page.quantReports.detail.recommendations.columns.capitalTime'),
    width: 130,
  },
  {
    key: 'hardReservedCash',
    title: $t(
      'page.quantReports.detail.recommendations.columns.hardReservedCash',
    ),
    width: 120,
  },
  {
    key: 'eligibility',
    title: $t('page.quantReports.detail.recommendations.columns.eligibility'),
    width: 150,
  },
  {
    dataIndex: 'status',
    key: 'status',
    title: $t('page.quantReports.detail.recommendations.columns.status'),
    width: 130,
  },
  {
    fixed: 'right' as const,
    key: 'open',
    title: $t('page.quantReports.detail.recommendations.columns.open'),
    width: 72,
  },
];
</script>

<template>
  <div v-if="recommendations.length > 0" class="mb-3 flex justify-end">
    <label class="sr-only" for="report-route-filter">
      {{ $t('page.quantReports.detail.recommendations.filterRoute') }}
    </label>
    <Select
      id="report-route-filter"
      v-model:value="routeFilter"
      allow-clear
      :aria-label="$t('page.quantReports.detail.recommendations.filterRoute')"
      class="w-48"
      data-testid="report-route-filter"
      :options="routeOptions"
      :placeholder="$t('page.quantReports.detail.recommendations.filterRoute')"
    />
  </div>
  <Empty
    v-if="visibleRecommendations.length === 0"
    :description="$t('page.quantReports.detail.recommendations.empty')"
    :image="Empty.PRESENTED_IMAGE_SIMPLE"
  />
  <Table
    v-else
    v-accessible-table-scroll="
      $t('page.quantReports.detail.recommendations.scrollLabel')
    "
    :columns="centerTableColumns(columns) ?? columns"
    :custom-row="rowProps"
    data-testid="global-report-recommendations"
    :data-source="visibleRecommendations"
    :pagination="false"
    row-key="recommendation_id"
    :scroll="{ x: 1780 }"
    size="small"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'route'">
        <Tag>{{ $t(`page.quantReports.routes.${record.route}`) }}</Tag>
      </template>
      <template v-else-if="column.key === 'outcome_side'">
        <EnumTag
          context="report-recommendations"
          name="OutcomeSide"
          :value="record.outcome_side"
        />
      </template>
      <template v-else-if="column.key === 'profit_probability'">
        <span class="font-mono">{{
          formatBps(record.economics.profit_probability_bps)
        }}</span>
      </template>
      <template v-else-if="column.key === 'robust_net'">
        <span class="font-mono">{{
          formatUsd(record.economics.robust_expected_net_usd)
        }}</span>
      </template>
      <template v-else-if="column.key === 'nominal_net'">
        <span class="font-mono">{{
          formatUsd(record.economics.nominal_expected_net_usd)
        }}</span>
      </template>
      <template v-else-if="column.key === 'marginal_value'">
        <span class="font-mono">{{
          formatUsd(record.economics.marginal_portfolio_value_usd)
        }}</span>
      </template>
      <template v-else-if="column.key === 'max_loss'">
        <span class="font-mono">{{
          formatUsd(record.economics.max_loss_usd)
        }}</span>
      </template>
      <template v-else-if="column.key === 'cvar'">
        <span class="font-mono">{{
          formatUsd(record.economics.cvar_contribution_usd)
        }}</span>
      </template>
      <template v-else-if="column.key === 'capital_time'">
        <span class="font-mono">{{
          formatScore(record.economics.capital_occupancy_usd_hours)
        }}</span>
      </template>
      <template v-else-if="column.key === 'hardReservedCash'">
        <span class="font-mono">
          {{ formatUsd(record.trade_plan.sizing.hard_reserved_cash_usd) }}
        </span>
      </template>
      <template v-else-if="column.key === 'eligibility'">
        <EnumTag
          context="report-recommendations"
          name="ExecutionAuthorityCeiling"
          :value="record.execution_eligibility.ceiling"
        />
      </template>
      <template v-else-if="column.key === 'status'">
        <EnumTag
          context="report-recommendations"
          name="RecommendationStatus"
          :value="record.status"
        />
      </template>
      <template v-else-if="column.key === 'open'">
        <Tooltip
          :title="$t('page.quantReports.detail.recommendations.columns.open')"
        >
          <Button
            :aria-label="
              $t('page.quantReports.detail.recommendations.columns.open')
            "
            size="small"
            type="link"
            @click.stop="openFullPage(record.recommendation_id)"
          >
            <IconifyIcon class="size-5" icon="lucide:external-link" />
          </Button>
        </Tooltip>
      </template>
    </template>
  </Table>
</template>
