<script lang="ts" setup>
import type {
  QuantReportDetailView,
  RecommendationDeltaView,
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
  formatDateTimeLocal,
  formatUsd,
} from '#/shared/components/format';
import {
  findTagOption,
  useOutcomeSideTagOptions,
  useRecommendationReportStatusTagOptions,
} from '#/shared/components/format/tag-options';

import { useReportComparePicker } from '../use-report-compare-picker';

defineOptions({ name: 'ReportDiffPanel' });

const props = defineProps<{ report: QuantReportDetailView }>();

const { handleRequest } = useRequestHandler();
const { load, loading: optionsLoading, options } = useReportComparePicker();

const sideTagOptions = useOutcomeSideTagOptions();
const statusTagOptions = useRecommendationReportStatusTagOptions();

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
    dataIndex: 'base_rank',
    key: 'base_rank',
    title: $t('page.quantReports.detail.diff.columns.baseRank'),
    width: 110,
  },
  {
    align: 'right' as const,
    dataIndex: 'compare_rank',
    key: 'compare_rank',
    title: $t('page.quantReports.detail.diff.columns.compareRank'),
    width: 120,
  },
  {
    align: 'right' as const,
    dataIndex: 'base_suggested_usd',
    key: 'base_suggested_usd',
    title: $t('page.quantReports.detail.diff.columns.baseSuggested'),
    width: 120,
  },
  {
    align: 'right' as const,
    dataIndex: 'compare_suggested_usd',
    key: 'compare_suggested_usd',
    title: $t('page.quantReports.detail.diff.columns.compareSuggested'),
    width: 130,
  },
  {
    align: 'right' as const,
    dataIndex: 'suggested_usd_delta',
    key: 'suggested_usd_delta',
    title: $t('page.quantReports.detail.diff.columns.delta'),
    width: 120,
  },
];

const hasCompare = computed(() => options.value.length > 0);
const baselineOption = computed(() =>
  options.value.find((option) => option.value === baselineId.value),
);
const thisStatusTag = computed(() =>
  findTagOption(statusTagOptions, props.report.status),
);
const baselineStatusTag = computed(() =>
  baselineOption.value
    ? findTagOption(statusTagOptions, baselineOption.value.status)
    : undefined,
);

function deltaRowKey(row: RecommendationDeltaView): string {
  return `${row.market_id}:${row.outcome_side}`;
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
  <div class="flex flex-col gap-4">
    <div class="flex items-center gap-2">
      <span class="text-muted-foreground text-sm">
        {{ $t('page.quantReports.detail.diff.compareLabel') }}
      </span>
      <Select
        v-model:value="baselineId"
        allow-clear
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
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'outcome_side'">
              <Tag
                :color="
                  findTagOption(sideTagOptions, record.outcome_side)?.color
                "
              >
                {{ findTagOption(sideTagOptions, record.outcome_side)?.label }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'base_rank'">
              {{ record.base_rank ?? EMPTY_PLACEHOLDER }}
            </template>
            <template v-else-if="column.key === 'compare_rank'">
              {{ record.compare_rank ?? EMPTY_PLACEHOLDER }}
            </template>
            <template v-else-if="column.key === 'base_suggested_usd'">
              <span class="font-mono">{{
                formatUsd(record.base_suggested_usd)
              }}</span>
            </template>
            <template v-else-if="column.key === 'compare_suggested_usd'">
              <span class="font-mono">{{
                formatUsd(record.compare_suggested_usd)
              }}</span>
            </template>
            <template v-else-if="column.key === 'suggested_usd_delta'">
              <span class="font-mono">{{
                formatUsd(record.suggested_usd_delta)
              }}</span>
            </template>
          </template>
        </Table>
      </Card>
    </template>
  </div>
</template>
