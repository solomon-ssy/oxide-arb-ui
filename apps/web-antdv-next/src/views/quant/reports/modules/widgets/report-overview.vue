<script lang="ts" setup>
import type {
  QuantReportDetailView,
  QuantReportDiagnosticsView,
} from '@vben/types';

import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { usePreferences } from '@vben/preferences';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Progress,
  Tag,
} from 'antdv-next';

import { $t } from '#/locales';
import DataList from '#/shared/components/data-list.vue';
import FeatureParityStatusPanel from '#/shared/components/feature-parity-status-panel.vue';
import {
  EMPTY_PLACEHOLDER,
  formatDateTimeLocal,
  formatDurationSecs,
  formatPercent,
  formatScore,
  formatUsd,
} from '#/shared/components/format';
import {
  findTagOption,
  useFeatureCellStateTagOptions,
  useModelInputStateTagOptions,
  useQuantRuntimeModeTagOptions,
  useRecommendationReportStatusTagOptions,
} from '#/shared/components/format/tag-options';
import { themeColors } from '#/shared/components/theme-color';

defineOptions({ name: 'ReportOverview' });

const props = defineProps<{
  diagnostics: null | QuantReportDiagnosticsView;
  report: QuantReportDetailView;
}>();

const router = useRouter();
const { isDark } = usePreferences();

const statusTagOptions = useRecommendationReportStatusTagOptions();
const modeTagOptions = useQuantRuntimeModeTagOptions();
const featureCellStateOptions = useFeatureCellStateTagOptions();
const modelInputStateOptions = useModelInputStateTagOptions();

const summary = computed(() => props.report.summary);
const factDelivery = computed(() => props.report.fact_delivery);
const factDeliveryVerified = computed(
  () => factDelivery.value?.status === 'verified',
);

function factDeliveryColor(status: string | undefined) {
  switch (status) {
    case 'delivering': {
      return 'processing';
    }
    case 'failed': {
      return 'error';
    }
    case 'retrying': {
      return 'warning';
    }
    case 'verified': {
      return 'success';
    }
    default: {
      return 'default';
    }
  }
}

// The backend projects the exact frozen v10 boundary. Re-deriving a cutoff in
// the browser would hide missing serving evidence and could diverge from
// source-specific availability lags.
const knowledgeCutoff = computed(
  () => props.diagnostics?.decision_boundary?.knowledge_cutoff ?? null,
);

const sourceCutoffRows = computed(() =>
  Object.entries(
    props.diagnostics?.decision_boundary?.per_source_cutoffs ?? {},
  ).map(([source, cutoff]) => ({ cutoff, source })),
);

const featureStateRows = computed(() =>
  Object.entries(props.diagnostics?.feature_state_counts ?? {}).map(
    ([state, count]) => ({ count, state }),
  ),
);
const modelInputStateRows = computed(() =>
  Object.entries(props.diagnostics?.model_input_state_counts ?? {}).map(
    ([state, count]) => ({ count, state }),
  ),
);

const isEmpty = computed(
  () => summary.value.published_recommendation_count === 0,
);

interface AllocationRow {
  key: string;
  label: string;
  value: string;
}

interface RejectionRow {
  count: number;
  key: string;
  label: string;
}

const allocationColumns = [
  { dataIndex: 'label', ellipsis: true, key: 'label' },
  { align: 'right' as const, dataIndex: 'value', key: 'value' },
];

const rejectionColumns = [
  { dataIndex: 'label', ellipsis: true, key: 'label' },
  { align: 'right' as const, dataIndex: 'count', key: 'count' },
];

const categoryAllocations = computed<AllocationRow[]>(() =>
  Object.entries(summary.value.category_allocation).map(([category, usd]) => ({
    key: category,
    label: $t(`enum.marketCategory.${category}`),
    value: usd,
  })),
);
const eventAllocations = computed<AllocationRow[]>(() =>
  Object.entries(summary.value.event_allocation).map(([event, usd]) => ({
    key: event,
    label: event,
    value: usd,
  })),
);
const rejectionRows = computed<RejectionRow[]>(() =>
  summary.value.top_rejection_reasons.map((item) => ({
    count: item.count,
    key: item.reason,
    label: $t(`enum.rejectionReason.${item.reason}`),
  })),
);

function displayCount(value: null | number | undefined): number | string {
  return value === null || value === undefined ? EMPTY_PLACEHOLDER : value;
}

// Frozen server-side at report-compose time from the exact account and
// decision-policy snapshot this report solved against. Never re-derived
// client-side from a separately fetched policy revision, which may not be the
// one used by this report and can encode a different bankroll denominator from
// the one enforced by the portfolio optimizer.
const aggregateExposureCapUsd = computed(() => {
  const raw = summary.value.aggregate_exposure_cap_usd;
  const parsed = raw === null || raw === undefined ? null : Number(raw);
  return parsed !== null && Number.isFinite(parsed) && parsed > 0
    ? parsed
    : null;
});

const aggregateExposureAllocatedUsd = computed(() =>
  Number(summary.value.total_suggested_usd),
);

const aggregateExposureProgress = computed(() => {
  const cap = aggregateExposureCapUsd.value;
  if (cap === null) {
    return 0;
  }
  return Math.min(
    100,
    Math.round((aggregateExposureAllocatedUsd.value / cap) * 100),
  );
});

const aggregateExposureProgressStatus = computed(() => {
  const pct = aggregateExposureProgress.value;
  if (pct >= 100) {
    return 'exception' as const;
  }
  if (pct >= 90) {
    return 'exception' as const;
  }
  if (pct >= 80) {
    return 'normal' as const;
  }
  return 'active' as const;
});

const aggregateExposureStrokeColor = computed(() => {
  void isDark.value;
  const pct = aggregateExposureProgress.value;
  if (pct >= 90) {
    return { from: themeColors.destructive, to: themeColors.destructive };
  }
  if (pct >= 80) {
    return { from: themeColors.warning, to: themeColors.destructive };
  }
  return undefined;
});

function openDecisionPolicyActivity() {
  void router.push('/system/config/activity');
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <Alert
      v-if="!factDeliveryVerified"
      :description="
        factDelivery?.last_error ??
        $t('page.quantReports.detail.factDelivery.pendingDescription')
      "
      :message="$t('page.quantReports.detail.factDelivery.notVerified')"
      show-icon
      :type="factDelivery?.status === 'failed' ? 'error' : 'warning'"
    />
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
    <Alert
      v-if="diagnostics?.subject === 'pre_inference_report'"
      :description="
        $t('page.quantReports.detail.servingAudit.preInferenceDescription', {
          stage: $t(`enum.featureParityStage.${diagnostics.stage_ceiling}`),
        })
      "
      :message="$t('page.quantReports.detail.servingAudit.preInference')"
      show-icon
      type="info"
    />

    <Card
      data-testid="report-fact-delivery"
      size="small"
      :title="$t('page.quantReports.detail.factDelivery.title')"
    >
      <Descriptions :column="2" bordered size="small">
        <DescriptionsItem
          :label="$t('page.quantReports.detail.factDelivery.status')"
        >
          <Tag :color="factDeliveryColor(factDelivery?.status)">
            {{
              factDelivery
                ? $t(
                    `page.quantReports.detail.factDelivery.statuses.${factDelivery.status}`,
                  )
                : $t('page.quantReports.detail.factDelivery.missing')
            }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.factDelivery.attempts')"
        >
          {{ factDelivery?.attempt_count ?? 0 }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="
            $t('page.quantReports.detail.factDelivery.recommendationRows')
          "
        >
          {{ factDelivery?.recommendation_row_count ?? EMPTY_PLACEHOLDER }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.factDelivery.funnelRows')"
        >
          {{ factDelivery?.funnel_row_count ?? EMPTY_PLACEHOLDER }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.factDelivery.bundleHash')"
          :span="2"
        >
          <span class="break-all font-mono text-xs">
            {{ factDelivery?.bundle_hash ?? EMPTY_PLACEHOLDER }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="
            $t('page.quantReports.detail.factDelivery.recommendationHash')
          "
          :span="2"
        >
          <span class="break-all font-mono text-xs">
            {{
              factDelivery?.recommendation_row_chain_hash ?? EMPTY_PLACEHOLDER
            }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.factDelivery.funnelHash')"
          :span="2"
        >
          <span class="break-all font-mono text-xs">
            {{ factDelivery?.funnel_row_chain_hash ?? EMPTY_PLACEHOLDER }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.factDelivery.nextAttemptAt')"
        >
          {{ formatDateTimeLocal(factDelivery?.next_attempt_at) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.factDelivery.verifiedAt')"
        >
          {{ formatDateTimeLocal(factDelivery?.verified_at) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.factDelivery.announcedAt')"
        >
          {{ formatDateTimeLocal(factDelivery?.announced_at) }}
        </DescriptionsItem>
        <DescriptionsItem
          v-if="factDelivery?.last_error"
          :label="$t('page.quantReports.detail.factDelivery.lastError')"
          :span="2"
        >
          <span class="text-destructive">{{ factDelivery.last_error }}</span>
        </DescriptionsItem>
      </Descriptions>
    </Card>

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
          :label="$t('page.quantReports.detail.overview.researchProfile')"
        >
          {{ report.profile_id }} · {{ report.profile_ref.id }}@{{
            report.profile_ref.version
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.triggerKind')"
        >
          {{
            report.run
              ? $t(`enum.reportTriggerKind.${report.run.trigger_kind}`)
              : EMPTY_PLACEHOLDER
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.triggerKey')"
        >
          <span class="font-mono text-xs">{{
            report.run?.trigger_key ?? EMPTY_PLACEHOLDER
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.triggerTime')"
        >
          {{
            formatDateTimeLocal(
              report.run?.scheduled_for ?? report.run?.requested_at,
            )
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.decisionAt')"
        >
          {{ formatDateTimeLocal(report.decision_at) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.knowledgeLag')"
        >
          {{ formatDurationSecs(report.run?.knowledge_lag_secs) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.knowledgeCutoff')"
        >
          {{ formatDateTimeLocal(knowledgeCutoff) }}
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
          :label="
            $t('page.quantReports.detail.overview.decisionPolicySnapshot')
          "
        >
          <Button
            class="px-0"
            size="small"
            type="link"
            @click="openDecisionPolicyActivity"
          >
            <span class="font-mono text-xs">{{
              report.decision_policy_snapshot_id
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

    <Card
      size="small"
      :title="$t('page.quantReports.detail.servingAudit.title')"
    >
      <Alert
        v-if="diagnostics && !diagnostics.evidence_complete"
        class="mb-3"
        :message="$t('page.quantReports.detail.servingAudit.incomplete')"
        show-icon
        type="error"
      />
      <Descriptions :column="2" bordered size="small">
        <DescriptionsItem
          :label="$t('page.quantReports.detail.servingAudit.subject')"
        >
          {{
            diagnostics
              ? $t(
                  `page.quantReports.detail.servingAudit.subjects.${diagnostics.subject}`,
                )
              : EMPTY_PLACEHOLDER
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.servingAudit.stageCeiling')"
        >
          {{
            diagnostics
              ? $t(`enum.featureParityStage.${diagnostics.stage_ceiling}`)
              : EMPTY_PLACEHOLDER
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.modelRun')"
          :span="2"
        >
          <span class="font-mono text-xs break-all">
            {{ report.model_run_id ?? EMPTY_PLACEHOLDER }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.servingAudit.modelFamily')"
        >
          {{ diagnostics?.model_route?.model_family ?? EMPTY_PLACEHOLDER }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.servingAudit.selectionCount')"
        >
          {{ displayCount(diagnostics?.selection_count) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.servingAudit.captureCount')"
        >
          {{ displayCount(diagnostics?.decision_capture_count) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.servingAudit.featureVectors')"
        >
          {{ displayCount(diagnostics?.feature_vector_count) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.servingAudit.featureCells')"
        >
          {{ displayCount(diagnostics?.feature_cell_count) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.servingAudit.modelInputs')"
        >
          {{ displayCount(diagnostics?.model_input_count) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.servingAudit.contractHash')"
          :span="2"
        >
          <span class="font-mono text-xs break-all">
            {{
              diagnostics?.model_route?.input_contract_hash ?? EMPTY_PLACEHOLDER
            }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.servingAudit.transformHash')"
          :span="2"
        >
          <span class="font-mono text-xs break-all">
            {{ diagnostics?.model_route?.transform_hash ?? EMPTY_PLACEHOLDER }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.servingAudit.trainingInputHash')"
          :span="2"
        >
          <span class="font-mono text-xs break-all">
            {{
              diagnostics?.model_route?.training_input_hash ?? EMPTY_PLACEHOLDER
            }}
          </span>
        </DescriptionsItem>
      </Descriptions>

      <div class="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Descriptions
          bordered
          :column="1"
          size="small"
          :title="$t('page.quantReports.detail.servingAudit.sourceCutoffs')"
        >
          <DescriptionsItem
            v-for="row in sourceCutoffRows"
            :key="row.source"
            :label="row.source"
          >
            {{ formatDateTimeLocal(row.cutoff) }}
          </DescriptionsItem>
          <DescriptionsItem v-if="sourceCutoffRows.length === 0" label="—">
            {{ EMPTY_PLACEHOLDER }}
          </DescriptionsItem>
        </Descriptions>
        <Descriptions
          bordered
          :column="1"
          size="small"
          :title="$t('page.quantReports.detail.servingAudit.featureStates')"
        >
          <DescriptionsItem
            v-for="row in featureStateRows"
            :key="row.state"
            :label="
              findTagOption(featureCellStateOptions, row.state)?.label ??
              EMPTY_PLACEHOLDER
            "
          >
            {{ row.count }}
          </DescriptionsItem>
        </Descriptions>
        <Descriptions
          bordered
          :column="1"
          size="small"
          :title="$t('page.quantReports.detail.servingAudit.inputStates')"
        >
          <DescriptionsItem
            v-for="row in modelInputStateRows"
            :key="row.state"
            :label="
              findTagOption(modelInputStateOptions, row.state)?.label ??
              EMPTY_PLACEHOLDER
            "
          >
            {{ row.count }}
          </DescriptionsItem>
        </Descriptions>
      </div>
    </Card>

    <Card
      size="small"
      :title="$t('page.quantReports.detail.summary.aggregateExposure')"
    >
      <div v-if="aggregateExposureCapUsd !== null" class="flex flex-col gap-2">
        <Progress
          :percent="aggregateExposureProgress"
          :status="aggregateExposureProgressStatus"
          :stroke-color="aggregateExposureStrokeColor"
        />
        <div class="flex items-center justify-between text-sm">
          <span>
            {{
              $t('page.quantReports.detail.summary.aggregateExposureAllocated')
            }}
            <span class="font-mono">{{
              formatUsd(String(aggregateExposureAllocatedUsd))
            }}</span>
          </span>
          <span>
            {{ $t('page.quantReports.detail.summary.aggregateExposureCap') }}
            <span class="font-mono">{{
              formatUsd(String(aggregateExposureCapUsd))
            }}</span>
          </span>
        </div>
      </div>
      <Alert
        v-else
        :message="
          $t('page.quantReports.detail.summary.aggregateExposureDisabled')
        "
        show-icon
        type="info"
      />
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

        <div v-if="rejectionRows.length > 0" class="flex flex-col gap-1">
          <span class="text-sm font-medium">
            {{ $t('page.quantReports.detail.summary.topRejections') }}
          </span>
          <DataList
            :columns="rejectionColumns"
            :data-source="rejectionRows"
            row-key="key"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'count'">
                <span class="font-mono">{{ record.count }}</span>
              </template>
            </template>
          </DataList>
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
          <DataList
            :columns="allocationColumns"
            :data-source="categoryAllocations"
            row-key="key"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'value'">
                <span class="font-mono">{{ formatUsd(record.value) }}</span>
              </template>
            </template>
          </DataList>
        </div>
        <div v-if="eventAllocations.length > 0" class="flex flex-col gap-1">
          <span class="text-sm font-medium">
            {{ $t('page.quantReports.detail.summary.eventAllocation') }}
          </span>
          <DataList
            :columns="allocationColumns"
            :data-source="eventAllocations"
            row-key="key"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'label'">
                <span class="font-mono text-xs">{{ record.label }}</span>
              </template>
              <template v-else-if="column.key === 'value'">
                <span class="font-mono">{{ formatUsd(record.value) }}</span>
              </template>
            </template>
          </DataList>
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

    <Card size="small" :title="$t('page.quantReports.detail.parity.title')">
      <FeatureParityStatusPanel :report-id="report.recommendation_report_id" />
    </Card>
  </div>
</template>
