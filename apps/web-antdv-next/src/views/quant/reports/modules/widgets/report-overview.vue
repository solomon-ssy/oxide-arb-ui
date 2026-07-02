<script lang="ts" setup>
import type { QuantReportDetailView } from '@vben/types';

import { computed } from 'vue';
import { useRouter } from 'vue-router';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Tag,
} from 'antdv-next';

import { $t } from '#/locales';
import {
  formatDateTimeLocal,
  formatDurationSecs,
  formatPercent,
  formatScore,
  formatUsd,
} from '#/shared/components/format';
import {
  findTagOption,
  useQuantRuntimeModeTagOptions,
  useRecommendationReportStatusTagOptions,
} from '#/shared/components/format/tag-options';

defineOptions({ name: 'ReportOverview' });

const props = defineProps<{ report: QuantReportDetailView }>();

const router = useRouter();

const statusTagOptions = useRecommendationReportStatusTagOptions();
const modeTagOptions = useQuantRuntimeModeTagOptions();

const summary = computed(() => props.report.summary);

const isEmpty = computed(
  () =>
    props.report.status === 'published_empty' ||
    summary.value.published_recommendation_count === 0,
);

const categoryAllocations = computed(() =>
  Object.entries(summary.value.category_allocation),
);
const eventAllocations = computed(() =>
  Object.entries(summary.value.event_allocation),
);

function openRuntimeConfig() {
  void router.push(
    `/runtime-config?version_id=${props.report.runtime_config_version_id}`,
  );
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <Alert
      v-if="report.status_reason"
      :message="report.status_reason"
      show-icon
      type="warning"
    />
    <Alert
      v-if="isEmpty"
      :description="
        report.empty_reason
          ? $t(`enum.emptyReportReason.${report.empty_reason}`)
          : $t('page.quantReports.detail.empty.description')
      "
      :message="$t('page.quantReports.detail.empty.title')"
      show-icon
      type="info"
    />

    <Card
      size="small"
      :title="$t('page.quantReports.detail.overview.identity')"
    >
      <Descriptions :column="2" bordered size="small">
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.reportId')"
        >
          <span class="font-mono text-xs">{{
            report.recommendation_report_id
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.status')"
        >
          <Tag :color="findTagOption(statusTagOptions, report.status)?.color">
            {{ findTagOption(statusTagOptions, report.status)?.label }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.detail.overview.kind')">
          {{ $t(`enum.reportKind.${report.report_kind}`) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.runtimeMode')"
        >
          <Tag
            :color="findTagOption(modeTagOptions, report.runtime_mode)?.color"
          >
            {{ findTagOption(modeTagOptions, report.runtime_mode)?.label }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.triggerKind')"
        >
          {{ $t(`enum.reportTriggerKind.${report.trigger_kind}`) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.triggerKey')"
        >
          <span class="font-mono text-xs">{{ report.trigger_key }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.triggerTime')"
        >
          {{ formatDateTimeLocal(report.trigger_time) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.detail.overview.asOf')">
          {{ formatDateTimeLocal(report.as_of) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.sourceDelay')"
        >
          {{ formatDurationSecs(report.source_delay_secs) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.horizon')"
        >
          {{ formatDurationSecs(report.horizon_secs) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.detail.overview.topN')">
          {{ report.top_n }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.capitalBase')"
        >
          <span class="font-mono">{{
            formatUsd(report.capital_base_usd)
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.accountSource')"
        >
          {{ $t(`enum.accountSource.${report.account_source}`) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.publishedAt')"
        >
          {{ formatDateTimeLocal(report.published_at) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.revokedAt')"
        >
          {{ formatDateTimeLocal(report.revoked_at) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.expiredAt')"
        >
          {{ formatDateTimeLocal(report.expired_at) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.createdAt')"
        >
          {{ formatDateTimeLocal(report.created_at) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.accountSnapshotRef')"
        >
          <span class="font-mono text-xs break-all">{{
            report.account_snapshot_ref
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.runtimeConfigVersion')"
        >
          <Button
            class="px-0"
            size="small"
            type="link"
            @click="openRuntimeConfig"
          >
            <span class="font-mono text-xs">{{
              report.runtime_config_version_id
            }}</span>
          </Button>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.modelVersion')"
        >
          <span class="font-mono text-xs break-all">{{
            report.model_version_id
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.marketSelection')"
        >
          <span class="font-mono text-xs break-all">{{
            report.market_selection_id
          }}</span>
        </DescriptionsItem>
      </Descriptions>
    </Card>

    <Card size="small" :title="$t('page.quantReports.detail.summary.title')">
      <Descriptions :column="4" bordered size="small">
        <DescriptionsItem
          :label="$t('page.quantReports.detail.summary.marketSelectionCount')"
        >
          {{ summary.market_selection_count }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.summary.candidateCount')"
        >
          {{ summary.candidate_count }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.summary.rejectedCount')"
        >
          {{ summary.rejected_count }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.summary.publishedCount')"
        >
          {{ summary.published_recommendation_count }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.summary.totalSuggested')"
        >
          <span class="font-mono">{{
            formatUsd(summary.total_suggested_usd)
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.summary.maxSingle')"
        >
          <span class="font-mono">{{
            formatUsd(summary.max_single_recommendation_usd)
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.summary.averageScore')"
        >
          <span class="font-mono">{{
            formatScore(summary.average_score)
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.summary.minScore')"
        >
          <span class="font-mono">{{ formatScore(summary.min_score) }}</span>
        </DescriptionsItem>
      </Descriptions>

      <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Descriptions
          bordered
          :column="1"
          size="small"
          :title="$t('page.quantReports.detail.summary.confidence')"
        >
          <DescriptionsItem
            :label="$t('page.quantReports.detail.summary.confidenceMean')"
          >
            <span class="font-mono">{{
              formatPercent(summary.model_confidence_summary.mean_confidence)
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantReports.detail.summary.confidenceMin')"
          >
            <span class="font-mono">{{
              formatPercent(summary.model_confidence_summary.min_confidence)
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantReports.detail.summary.confidenceMax')"
          >
            <span class="font-mono">{{
              formatPercent(summary.model_confidence_summary.max_confidence)
            }}</span>
          </DescriptionsItem>
        </Descriptions>

        <Descriptions
          bordered
          :column="1"
          size="small"
          :title="$t('page.quantReports.detail.summary.dataQuality')"
        >
          <DescriptionsItem
            :label="$t('page.quantReports.detail.summary.dqFresh')"
          >
            {{ summary.data_quality_summary.fresh_count }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantReports.detail.summary.dqAcceptable')"
          >
            {{ summary.data_quality_summary.acceptable_count }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantReports.detail.summary.dqDegraded')"
          >
            {{ summary.data_quality_summary.degraded_count }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantReports.detail.summary.dqStale')"
          >
            {{ summary.data_quality_summary.stale_count }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantReports.detail.summary.dqInsufficient')"
          >
            {{ summary.data_quality_summary.insufficient_count }}
          </DescriptionsItem>
        </Descriptions>

        <Descriptions
          bordered
          :column="1"
          size="small"
          :title="$t('page.quantReports.detail.summary.eligibility')"
        >
          <DescriptionsItem
            :label="$t('page.quantReports.detail.summary.eligibleReportOnly')"
          >
            {{ summary.execution_eligibility_summary.eligible_report_only }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantReports.detail.summary.eligibleSemiAuto')"
          >
            {{ summary.execution_eligibility_summary.eligible_semi_auto }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t('page.quantReports.detail.summary.eligibleAutoExecution')
            "
          >
            {{ summary.execution_eligibility_summary.eligible_auto_execution }}
          </DescriptionsItem>
        </Descriptions>

        <div
          v-if="summary.top_rejection_reasons.length > 0"
          class="flex flex-col gap-1"
        >
          <span class="text-sm font-medium">
            {{ $t('page.quantReports.detail.summary.topRejections') }}
          </span>
          <div
            v-for="item in summary.top_rejection_reasons"
            :key="item.reason"
            class="flex items-center justify-between text-sm"
          >
            <span>{{ $t(`enum.rejectionReason.${item.reason}`) }}</span>
            <span class="font-mono">{{ item.count }}</span>
          </div>
        </div>
      </div>

      <div
        v-if="categoryAllocations.length > 0 || eventAllocations.length > 0"
        class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2"
      >
        <div v-if="categoryAllocations.length > 0" class="flex flex-col gap-1">
          <span class="text-sm font-medium">
            {{ $t('page.quantReports.detail.summary.categoryAllocation') }}
          </span>
          <div
            v-for="[category, usd] in categoryAllocations"
            :key="category"
            class="flex items-center justify-between text-sm"
          >
            <span>{{ $t(`enum.marketCategory.${category}`) }}</span>
            <span class="font-mono">{{ formatUsd(usd) }}</span>
          </div>
        </div>
        <div v-if="eventAllocations.length > 0" class="flex flex-col gap-1">
          <span class="text-sm font-medium">
            {{ $t('page.quantReports.detail.summary.eventAllocation') }}
          </span>
          <div
            v-for="[event, usd] in eventAllocations"
            :key="event"
            class="flex items-center justify-between text-sm"
          >
            <span class="font-mono text-xs">{{ event }}</span>
            <span class="font-mono">{{ formatUsd(usd) }}</span>
          </div>
        </div>
      </div>

      <Alert
        v-for="(warning, index) in summary.warnings"
        :key="index"
        class="mt-2"
        :message="warning"
        show-icon
        type="warning"
      />
    </Card>
  </div>
</template>
