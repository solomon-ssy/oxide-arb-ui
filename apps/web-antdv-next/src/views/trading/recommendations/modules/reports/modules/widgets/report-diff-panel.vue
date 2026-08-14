<script lang="ts" setup>
import type {
  QuantReportDetailView,
  RecommendationChangedField,
  RecommendationDeltaView,
  RecommendationDiffSnapshotView,
  ReportDiffView,
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
  Table,
  Tag,
} from 'antdv-next';

import { getReportDiff } from '#/api/quant-reports';
import { $t } from '#/locales';
import {
  EMPTY_PLACEHOLDER,
  formatBps,
  formatDateTimeLocal,
  formatScore,
  formatUsd,
} from '#/shared/components/format';
import { enumOption, enumOptions } from '#/shared/presentation/enum-options';

import { useReportComparePicker } from '../use-report-compare-picker';

defineOptions({ name: 'ReportDiffPanel' });

const props = defineProps<{ report: QuantReportDetailView }>();

const { handleRequest } = useRequestHandler();
const { load, loading: optionsLoading, options } = useReportComparePicker();

const sideTagOptions = enumOptions('OutcomeSide');
const statusTagOptions = enumOptions('RecommendationReportStatus');

// The report being viewed is always the *compare* (newer) side; the picker
// chooses the *baseline* (older) side. Diff = baseline -> this report.
const baselineId = ref<string | undefined>(undefined);
const diff = ref<null | ReportDiffView>(null);
const failed = ref(false);
const diffLoading = ref(false);

const deltaColumns = [
  {
    dataIndex: 'market_id',
    key: 'market_id',
    title: $t('page.quantReports.detail.diff.columns.market'),
  },
  {
    dataIndex: 'outcome_side',
    key: 'outcome_side',
    title: $t('page.quantReports.detail.diff.columns.side'),
    width: 90,
  },
  {
    align: 'right' as const,
    dataIndex: ['base', 'rank'],
    key: 'base_rank',
    title: $t('page.quantReports.detail.diff.columns.baseRank'),
    width: 110,
  },
  {
    align: 'right' as const,
    dataIndex: ['compare', 'rank'],
    key: 'compare_rank',
    title: $t('page.quantReports.detail.diff.columns.compareRank'),
    width: 120,
  },
  {
    align: 'right' as const,
    key: 'base_robust_net',
    title: $t('page.quantReports.detail.diff.columns.baseRobustNet'),
    width: 120,
  },
  {
    align: 'right' as const,
    key: 'compare_robust_net',
    title: $t('page.quantReports.detail.diff.columns.compareRobustNet'),
    width: 130,
  },
  {
    align: 'right' as const,
    dataIndex: 'suggested_usd_delta',
    key: 'suggested_usd_delta',
    title: $t('page.quantReports.detail.diff.columns.delta'),
    width: 120,
  },
  {
    dataIndex: 'changed_fields',
    key: 'changed_fields',
    title: $t('page.quantReports.detail.diff.columns.changedFields'),
    width: 280,
  },
];

const hasCompare = computed(() => options.value.length > 0);
const baselineOption = computed(() =>
  options.value.find((option) => option.value === baselineId.value),
);
const thisStatusTag = computed(() =>
  enumOption(statusTagOptions, props.report.status),
);
const baselineStatusTag = computed(() =>
  baselineOption.value
    ? enumOption(statusTagOptions, baselineOption.value.status)
    : undefined,
);

function deltaRowKey(row: RecommendationDeltaView): string {
  return `${row.market_id}:${row.outcome_side}`;
}

function suggestedUsd(
  snapshot: null | RecommendationDiffSnapshotView,
): null | string {
  return snapshot?.trade_plan.sizing.suggested_usd ?? null;
}

function changedFieldLabel(field: RecommendationChangedField): string {
  return $t(`page.quantReports.detail.diff.fields.${field}`);
}

function economicsSummary(
  snapshot: null | RecommendationDiffSnapshotView,
): string {
  if (!snapshot) return EMPTY_PLACEHOLDER;
  const economics = snapshot.economics;
  return [
    `P(profit) ${formatBps(economics.profit_probability_bps)}`,
    `robust ${formatUsd(economics.robust_expected_net_usd)}`,
    `nominal ${formatUsd(economics.nominal_expected_net_usd)}`,
    `CVaR ${formatUsd(economics.cvar_contribution_usd)}`,
    `USD·h ${formatScore(economics.capital_occupancy_usd_hours)}`,
  ].join(' · ');
}

function validitySummary(
  snapshot: null | RecommendationDiffSnapshotView,
): string {
  return snapshot
    ? `${formatDateTimeLocal(snapshot.valid_from)} → ${formatDateTimeLocal(snapshot.valid_until)}`
    : EMPTY_PLACEHOLDER;
}

function entrySummary(snapshot: null | RecommendationDiffSnapshotView): string {
  if (!snapshot) {
    return EMPTY_PLACEHOLDER;
  }
  const { entry } = snapshot.trade_plan;
  return `${entry.order_policy.kind} · ${entry.entry_reason}`;
}

function exitSummary(snapshot: null | RecommendationDiffSnapshotView): string {
  if (!snapshot) {
    return EMPTY_PLACEHOLDER;
  }
  const { exit } = snapshot.trade_plan;
  return `${exit.settlement_mode} · ${exit.exit_reason}`;
}

function eligibilitySummary(
  snapshot: null | RecommendationDiffSnapshotView,
): string {
  if (!snapshot) return EMPTY_PLACEHOLDER;
  const eligibility = snapshot.execution_eligibility;
  const modes = eligibility.eligible_modes.join(', ') || EMPTY_PLACEHOLDER;
  const reasons = eligibility.ineligibility_reasons.join(', ');
  return reasons ? `${modes} · ${reasons}` : modes;
}

async function runDiff() {
  const baseline = baselineId.value;
  if (!baseline) {
    return;
  }
  diffLoading.value = true;
  failed.value = false;
  diff.value = null;
  // Diff failure is isolated: it never blocks the detail view. Bypass the
  // global error toast and render an inline alert instead. Direction is fixed:
  // baseline (older) is `base`, this report (current) is `compare`.
  const result = await handleRequest(
    () => getReportDiff(baseline, props.report.recommendation_report_id),
    { onError: () => (failed.value = true), silent: true },
  );
  diff.value = result;
  diffLoading.value = false;
}

watch(baselineId, () => void runDiff());

onMounted(async () => {
  baselineId.value = await load(props.report);
  if (baselineId.value) {
    await runDiff();
  }
});
</script>

<template>
  <div class="flex flex-col gap-4" data-testid="report-diff">
    <div class="flex items-center gap-2">
      <span class="text-muted-foreground text-sm">
        {{ $t('page.quantReports.detail.diff.compareLabel') }}
      </span>
      <Select
        v-model:value="baselineId"
        allow-clear
        :aria-label="$t('page.quantReports.detail.diff.compareLabel')"
        class="min-w-96"
        :loading="optionsLoading"
        :options="options"
        :placeholder="$t('page.quantReports.detail.diff.comparePlaceholder')"
        show-search
        :filter-option="
          (input: string, option: any) =>
            option.label.toLowerCase().includes(input.toLowerCase())
        "
      />
      <Button :disabled="!baselineId" :loading="diffLoading" @click="runDiff">
        {{ $t('page.quantReports.detail.diff.run') }}
      </Button>
    </div>

    <Empty
      v-if="!hasCompare && !optionsLoading"
      :description="$t('page.quantReports.detail.diff.empty')"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />

    <Alert
      v-if="failed"
      :message="$t('page.quantReports.detail.diff.failed')"
      show-icon
      type="warning"
    />

    <template v-if="diff">
      <Alert type="info" show-icon>
        <template #message>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span>
              {{ $t('page.quantReports.detail.diff.baselineReport') }}:
              <span class="font-mono">{{
                baselineOption
                  ? formatDateTimeLocal(baselineOption.decision_at)
                  : EMPTY_PLACEHOLDER
              }}</span>
              <Tag
                v-if="baselineStatusTag"
                class="ml-1"
                :color="baselineStatusTag.color"
              >
                {{ baselineStatusTag.label }}
              </Tag>
            </span>
            <span>→</span>
            <span>
              {{ $t('page.quantReports.detail.diff.thisReport') }}:
              <span class="font-mono">{{
                formatDateTimeLocal(report.decision_at)
              }}</span>
              <Tag
                v-if="thisStatusTag"
                class="ml-1"
                :color="thisStatusTag.color"
              >
                {{ thisStatusTag.label }}
              </Tag>
            </span>
          </div>
        </template>
      </Alert>

      <Descriptions
        bordered
        :column="3"
        size="small"
        :title="$t('page.quantReports.detail.diff.totals')"
      >
        <DescriptionsItem
          :label="$t('page.quantReports.detail.diff.baseTotal')"
        >
          <span class="font-mono">{{
            formatUsd(diff.base_total_suggested_usd)
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.diff.compareTotal')"
        >
          <span class="font-mono">{{
            formatUsd(diff.compare_total_suggested_usd)
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.detail.diff.delta')">
          <span class="font-mono">{{
            formatUsd(diff.total_suggested_usd_delta)
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.diff.eligibilityCompare')"
          :span="3"
        >
          <div class="flex flex-wrap gap-3 font-mono text-xs">
            <span>
              {{ $t('enum.quantRuntimeMode.report_only') }}:
              {{ diff.base_eligibility.eligible_report_only }} →
              {{ diff.compare_eligibility.eligible_report_only }}
            </span>
            <span>
              {{ $t('enum.quantRuntimeMode.semi_auto') }}:
              {{ diff.base_eligibility.eligible_semi_auto }} →
              {{ diff.compare_eligibility.eligible_semi_auto }}
            </span>
            <span>
              {{ $t('enum.quantRuntimeMode.auto_execution') }}:
              {{ diff.base_eligibility.eligible_auto_execution }} →
              {{ diff.compare_eligibility.eligible_auto_execution }}
            </span>
          </div>
        </DescriptionsItem>
      </Descriptions>

      <Card
        v-for="group in [
          { key: 'added', rows: diff.added },
          { key: 'removed', rows: diff.removed },
          { key: 'retained', rows: diff.retained },
        ]"
        :key="group.key"
        size="small"
        :title="`${$t(`page.quantReports.detail.diff.${group.key}`)} (${group.rows.length})`"
      >
        <Table
          :columns="deltaColumns"
          :data-source="group.rows"
          :pagination="false"
          :row-key="deltaRowKey"
          :scroll="{ x: 1280 }"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'outcome_side'">
              <Tag
                :color="enumOption(sideTagOptions, record.outcome_side)?.color"
              >
                {{ enumOption(sideTagOptions, record.outcome_side)?.label }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'base_rank'">
              {{ record.base?.rank ?? EMPTY_PLACEHOLDER }}
            </template>
            <template v-else-if="column.key === 'compare_rank'">
              {{ record.compare?.rank ?? EMPTY_PLACEHOLDER }}
            </template>
            <template v-else-if="column.key === 'base_robust_net'">
              <span class="font-mono">{{
                record.base
                  ? formatUsd(record.base.economics.robust_expected_net_usd)
                  : EMPTY_PLACEHOLDER
              }}</span>
            </template>
            <template v-else-if="column.key === 'compare_robust_net'">
              <span class="font-mono">{{
                record.compare
                  ? formatUsd(record.compare.economics.robust_expected_net_usd)
                  : EMPTY_PLACEHOLDER
              }}</span>
            </template>
            <template v-else-if="column.key === 'suggested_usd_delta'">
              <span class="font-mono">{{
                formatUsd(record.suggested_usd_delta)
              }}</span>
            </template>
            <template v-else-if="column.key === 'changed_fields'">
              <div class="flex flex-wrap gap-1">
                <Tag v-for="field in record.changed_fields" :key="field">
                  {{ changedFieldLabel(field) }}
                </Tag>
                <span v-if="record.changed_fields.length === 0">
                  {{ EMPTY_PLACEHOLDER }}
                </span>
              </div>
            </template>
          </template>
          <template #expandedRowRender="{ record }">
            <Descriptions bordered :column="2" size="small">
              <DescriptionsItem
                :label="$t('page.quantReports.detail.diff.details.scores')"
              >
                <div>{{ economicsSummary(record.base) }}</div>
                <div>{{ economicsSummary(record.compare) }}</div>
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.quantReports.detail.diff.details.sizing')"
              >
                {{ formatUsd(suggestedUsd(record.base)) }} →
                {{ formatUsd(suggestedUsd(record.compare)) }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.quantReports.detail.diff.details.validity')"
              >
                <div>{{ validitySummary(record.base) }}</div>
                <div>{{ validitySummary(record.compare) }}</div>
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.quantReports.detail.diff.details.eligibility')"
              >
                <div>{{ eligibilitySummary(record.base) }}</div>
                <div>{{ eligibilitySummary(record.compare) }}</div>
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.quantReports.detail.diff.details.entry')"
              >
                <div>{{ entrySummary(record.base) }}</div>
                <div>{{ entrySummary(record.compare) }}</div>
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.quantReports.detail.diff.details.exit')"
              >
                <div>{{ exitSummary(record.base) }}</div>
                <div>{{ exitSummary(record.compare) }}</div>
              </DescriptionsItem>
            </Descriptions>
          </template>
        </Table>
      </Card>
    </template>
  </div>
</template>
