<script lang="ts" setup>
import type {
  QuantReportDetailView,
  QuantReportDiagnosticsView,
  ReportRouteDiagnosticsView,
} from '@vben/types';

import { computed } from 'vue';
import { useRouter } from 'vue-router';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Table,
  Tag,
} from 'antdv-next';

import { $t } from '#/locales';
import {
  EMPTY_PLACEHOLDER,
  formatDateTimeLocal,
  formatDurationSecs,
  formatScore,
  formatUsd,
} from '#/shared/components/format';
import { enumOption, enumOptions } from '#/shared/presentation/enum-options';
import SubjectParityPanel from '#/views/research/data-reliability/modules/integrity/components/subject-parity-panel.vue';

defineOptions({ name: 'ReportOverview' });

const props = defineProps<{
  diagnostics: null | QuantReportDiagnosticsView;
  report: QuantReportDetailView;
}>();

const emit = defineEmits<{
  selectRoute: [route: ReportRouteDiagnosticsView];
}>();

const router = useRouter();
const statusTagOptions = enumOptions('RecommendationReportStatus');
const modeTagOptions = enumOptions('QuantRuntimeMode');

const summary = computed(() => props.report.summary);
const factDelivery = computed(() => props.report.fact_delivery);
const isEmpty = computed(
  () => summary.value.published_recommendation_count === 0,
);
const globalEvidence = computed(() => props.diagnostics?.global ?? null);
const optimizedPlan = computed(() =>
  props.report.portfolio_decision.outcome === 'optimized'
    ? props.report.portfolio_decision.plan
    : null,
);
const knowledgeCutoff = computed(
  () => props.diagnostics?.decision_boundary.knowledge_cutoff ?? null,
);
const sourceCutoffs = computed(() =>
  Object.entries(
    props.diagnostics?.decision_boundary.per_source_cutoffs ?? {},
  ).map(([source, cutoff]) => ({ cutoff, source })),
);

const twoColumnLayout = { lg: 2, md: 2, sm: 1, xl: 2, xs: 1, xxl: 2 };
const threeColumnLayout = { lg: 3, md: 2, sm: 1, xl: 3, xs: 1, xxl: 3 };
const fourColumnLayout = { lg: 4, md: 2, sm: 1, xl: 4, xs: 1, xxl: 4 };

const routeColumns = [
  {
    dataIndex: 'route',
    key: 'route',
    title: $t('page.quantReports.detail.routes.route'),
    width: 120,
  },
  {
    dataIndex: 'outcome',
    key: 'outcome',
    title: $t('page.quantReports.detail.routes.outcome'),
    width: 150,
  },
  {
    key: 'model',
    title: $t('page.quantReports.detail.routes.model'),
  },
  {
    align: 'right' as const,
    key: 'eligible',
    title: $t('page.quantReports.detail.routes.eligible'),
    width: 110,
  },
  {
    align: 'right' as const,
    key: 'candidates',
    title: $t('page.quantReports.detail.routes.candidates'),
    width: 110,
  },
  {
    align: 'right' as const,
    key: 'selected',
    title: $t('page.quantReports.detail.routes.selected'),
    width: 110,
  },
  {
    key: 'stage',
    title: $t('page.quantReports.detail.routes.stage'),
    width: 160,
  },
  {
    align: 'right' as const,
    key: 'detail',
    title: $t('common.detail'),
    width: 90,
  },
];

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

function routeOutcomeColor(outcome: ReportRouteDiagnosticsView['outcome']) {
  switch (outcome) {
    case 'failed': {
      return 'error';
    }
    case 'ready': {
      return 'success';
    }
    case 'zero_candidates': {
      return 'warning';
    }
  }
}

function displayCount(value: null | number | undefined): number | string {
  return value === null || value === undefined ? EMPTY_PLACEHOLDER : value;
}

function openDecisionPolicyActivity() {
  void router.push('/system/config?module=history');
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <Alert
      v-if="factDelivery?.status !== 'verified'"
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
        summary.empty_reason
          ? $t(`enum.emptyReportReason.${summary.empty_reason}`)
          : $t('page.quantReports.detail.empty.description')
      "
      :message="$t('page.quantReports.detail.empty.title')"
      show-icon
      type="info"
    />
    <Alert
      v-if="diagnostics && !diagnostics.global.evidence_complete"
      :message="$t('page.quantReports.detail.servingAudit.incomplete')"
      show-icon
      type="error"
    />

    <Card
      data-testid="global-portfolio-economics"
      size="small"
      :title="$t('page.quantReports.detail.portfolio.title')"
    >
      <Descriptions :column="fourColumnLayout" bordered size="small">
        <DescriptionsItem
          :label="$t('page.quantReports.detail.portfolio.robustNet')"
        >
          <span class="font-mono">{{
            formatUsd(summary.robust_expected_net_usd)
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.portfolio.nominalNet')"
        >
          <span class="font-mono">{{
            formatUsd(summary.nominal_expected_net_usd)
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.portfolio.cvar')"
        >
          <span class="font-mono">{{ formatUsd(summary.cvar_usd) }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.portfolio.maximumScenarioLoss')"
        >
          <span class="font-mono">{{
            formatUsd(summary.maximum_scenario_loss_usd)
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.portfolio.capitalTime')"
        >
          <span class="font-mono">
            {{ formatScore(summary.capital_occupancy_usd_hours) }} USD·h
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.summary.totalHardReservedCash')"
        >
          <span class="font-mono">{{
            formatUsd(summary.total_hard_reserved_cash_usd)
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.summary.publishedCount')"
        >
          {{ summary.published_recommendation_count }} / {{ report.top_n }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.summary.rejectedTierCount')"
        >
          {{ summary.rejected_tier_count }}
        </DescriptionsItem>
      </Descriptions>
    </Card>

    <Card
      data-testid="portfolio-solver-evidence"
      size="small"
      :title="$t('page.quantReports.detail.optimizer.title')"
    >
      <Alert
        v-if="!optimizedPlan"
        :description="
          report.portfolio_decision.outcome === 'zero_candidates'
            ? report.portfolio_decision.evidence_hash
            : undefined
        "
        :message="$t('page.quantReports.detail.optimizer.zeroCandidates')"
        show-icon
        type="info"
      />
      <template v-else>
        <Alert
          class="mb-3"
          :message="
            optimizedPlan.solver.optimal &&
            optimizedPlan.exact_verification.passed
              ? $t('page.quantReports.detail.optimizer.verified')
              : $t('page.quantReports.detail.optimizer.invalid')
          "
          show-icon
          :type="
            optimizedPlan.solver.optimal &&
            optimizedPlan.exact_verification.passed
              ? 'success'
              : 'error'
          "
        />
        <Descriptions :column="fourColumnLayout" bordered size="small">
          <DescriptionsItem
            :label="$t('page.quantReports.detail.optimizer.backend')"
          >
            {{ optimizedPlan.solver.backend }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantReports.detail.optimizer.stages')"
          >
            {{ optimizedPlan.solver.lexicographic_solve_count }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantReports.detail.optimizer.threads')"
          >
            {{ optimizedPlan.solver.deterministic_threads }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantReports.detail.optimizer.scale')"
          >
            {{ optimizedPlan.solver.coefficient_scale }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantReports.detail.optimizer.boundScaleExponent')"
          >
            2^{{ optimizedPlan.solver.bound_scale_exponent }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantReports.detail.optimizer.constraints')"
          >
            {{ optimizedPlan.constraints.checked_constraint_count }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantReports.detail.optimizer.availableCashUsed')"
          >
            <span class="font-mono">{{
              formatUsd(optimizedPlan.constraints.available_cash_used_usd)
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantReports.detail.optimizer.openCapital')"
          >
            <span class="font-mono">{{
              formatUsd(optimizedPlan.constraints.open_capital_usd)
            }}</span>
          </DescriptionsItem>
        </Descriptions>
        <Descriptions :column="1" bordered class="mt-3" size="small">
          <DescriptionsItem
            :label="$t('page.quantReports.detail.optimizer.selectedTiers')"
          >
            {{ optimizedPlan.selected_tier_ids.length }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantReports.detail.optimizer.constraintHash')"
          >
            <span class="font-mono text-xs break-all">{{
              optimizedPlan.constraints.evidence_hash
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantReports.detail.optimizer.recomputedHash')"
          >
            <span class="font-mono text-xs break-all">{{
              optimizedPlan.exact_verification.recomputed_economics_hash
            }}</span>
          </DescriptionsItem>
        </Descriptions>
      </template>
    </Card>

    <Card
      size="small"
      :title="$t('page.quantReports.detail.overview.identity')"
    >
      <Descriptions :column="twoColumnLayout" bordered size="small">
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.reportId')"
        >
          <span class="font-mono text-xs break-all">{{
            report.recommendation_report_id
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.status')"
        >
          <Tag :color="enumOption(statusTagOptions, report.status)?.color">
            {{ enumOption(statusTagOptions, report.status)?.label }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.routes')"
        >
          <div class="flex flex-wrap gap-1" data-testid="represented-routes">
            <Tag v-for="route in report.represented_routes.routes" :key="route">
              {{ $t(`page.quantReports.routes.${route}`) }}
            </Tag>
          </div>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.routeSetDigest')"
        >
          <span class="font-mono text-xs break-all">{{
            report.represented_routes.digest
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.scenarioArtifact')"
        >
          <span class="font-mono text-xs break-all">{{
            report.scenario_artifact_id ?? EMPTY_PLACEHOLDER
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.scenarioHash')"
        >
          <span class="font-mono text-xs break-all">{{
            report.scenario_artifact_hash ?? EMPTY_PLACEHOLDER
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.detail.overview.kind')">
          {{ $t(`enum.reportKind.${report.report_kind}`) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.runtimeMode')"
        >
          <Tag :color="enumOption(modeTagOptions, report.runtime_mode)?.color">
            {{ enumOption(modeTagOptions, report.runtime_mode)?.label }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.decisionAt')"
        >
          {{ formatDateTimeLocal(report.decision_at) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.knowledgeCutoff')"
        >
          {{ formatDateTimeLocal(knowledgeCutoff) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.knowledgeLag')"
        >
          {{ formatDurationSecs(report.run?.knowledge_lag_secs) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.overview.capitalBase')"
        >
          <span class="font-mono">{{
            formatUsd(report.capital_base_usd)
          }}</span>
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
          :label="$t('page.quantReports.detail.overview.portfolioPlan')"
        >
          <span class="font-mono text-xs break-all">{{
            report.portfolio_plan_id
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
      data-testid="route-readiness"
      size="small"
      :title="$t('page.quantReports.detail.routes.title')"
    >
      <Alert
        v-if="!diagnostics"
        :message="$t('page.quantReports.detail.routes.missing')"
        show-icon
        type="error"
      />
      <Table
        v-else
        :columns="routeColumns"
        :data-source="diagnostics.routes"
        :pagination="false"
        row-key="report_route_run_id"
        :scroll="{ x: 1080 }"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <Tag v-if="column.key === 'route'">
            {{ $t(`page.quantReports.routes.${record.route}`) }}
          </Tag>
          <Tag
            v-else-if="column.key === 'outcome'"
            :color="routeOutcomeColor(record.outcome)"
          >
            {{
              $t(`page.quantReports.detail.routes.outcomes.${record.outcome}`)
            }}
          </Tag>
          <span v-else-if="column.key === 'model'" class="font-mono text-xs">
            {{ record.lineage?.model_version_id ?? EMPTY_PLACEHOLDER }}
          </span>
          <span v-else-if="column.key === 'eligible'">
            {{ record.funnel.eligible_markets }}
          </span>
          <span v-else-if="column.key === 'candidates'">
            {{ record.funnel.calibrated_candidates }}
          </span>
          <span v-else-if="column.key === 'selected'">
            {{ record.funnel.selected_recommendations }}
          </span>
          <span v-else-if="column.key === 'stage'">
            {{ $t(`enum.featureParityStage.${record.evidence.stage_ceiling}`) }}
          </span>
          <Button
            v-else-if="column.key === 'detail'"
            data-testid="open-route-lineage"
            size="small"
            type="link"
            @click="emit('selectRoute', record)"
          >
            {{ $t('common.detail') }}
          </Button>
        </template>
      </Table>
    </Card>

    <div class="grid grid-cols-1 gap-4 2xl:grid-cols-3">
      <Card
        size="small"
        :title="$t('page.quantReports.detail.summary.routeAllocation')"
      >
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem
            v-for="(usd, route) in summary.route_allocation"
            :key="route"
            :label="$t(`page.quantReports.routes.${route}`)"
          >
            <span class="font-mono">{{ formatUsd(usd) }}</span>
          </DescriptionsItem>
        </Descriptions>
      </Card>
      <Card
        size="small"
        :title="$t('page.quantReports.detail.summary.categoryAllocation')"
      >
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem
            v-for="(usd, category) in summary.category_allocation"
            :key="category"
            :label="$t(`enum.marketCategory.${category}`)"
          >
            <span class="font-mono">{{ formatUsd(usd) }}</span>
          </DescriptionsItem>
        </Descriptions>
      </Card>
      <Card
        size="small"
        :title="$t('page.quantReports.detail.summary.eventAllocation')"
      >
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem
            v-for="(usd, event) in summary.event_allocation"
            :key="event"
            :label="event"
          >
            <span class="font-mono">{{ formatUsd(usd) }}</span>
          </DescriptionsItem>
        </Descriptions>
      </Card>
    </div>

    <Card
      data-testid="report-serving-audit"
      size="small"
      :title="$t('page.quantReports.detail.servingAudit.title')"
    >
      <Descriptions :column="threeColumnLayout" bordered size="small">
        <DescriptionsItem
          :label="$t('page.quantReports.detail.servingAudit.stageCeiling')"
        >
          {{
            globalEvidence
              ? $t(`enum.featureParityStage.${globalEvidence.stage_ceiling}`)
              : EMPTY_PLACEHOLDER
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.servingAudit.selectionCount')"
        >
          {{ displayCount(globalEvidence?.selection_count) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.servingAudit.captureCount')"
        >
          {{ displayCount(globalEvidence?.decision_capture_count) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.servingAudit.featureVectors')"
        >
          {{ displayCount(globalEvidence?.feature_vector_count) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.servingAudit.featureCells')"
        >
          {{ displayCount(globalEvidence?.feature_cell_count) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.servingAudit.modelInputs')"
        >
          {{ displayCount(globalEvidence?.model_input_count) }}
        </DescriptionsItem>
        <DescriptionsItem
          v-for="row in sourceCutoffs"
          :key="row.source"
          :label="row.source"
        >
          {{ formatDateTimeLocal(row.cutoff) }}
        </DescriptionsItem>
      </Descriptions>
    </Card>

    <Card
      data-testid="report-fact-delivery"
      size="small"
      :title="$t('page.quantReports.detail.factDelivery.title')"
    >
      <Descriptions :column="threeColumnLayout" bordered size="small">
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
          :label="
            $t('page.quantReports.detail.factDelivery.recommendationRows')
          "
        >
          {{ displayCount(factDelivery?.recommendation_row_count) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.factDelivery.funnelRows')"
        >
          {{ displayCount(factDelivery?.funnel_row_count) }}
        </DescriptionsItem>
      </Descriptions>
      <Descriptions :column="1" bordered class="mt-3" size="small">
        <DescriptionsItem
          :label="$t('page.quantReports.detail.factDelivery.bundleHash')"
        >
          <span class="font-mono text-xs break-all">{{
            factDelivery?.bundle_hash ?? EMPTY_PLACEHOLDER
          }}</span>
        </DescriptionsItem>
      </Descriptions>
    </Card>

    <Alert
      v-for="(warning, index) in summary.warnings"
      :key="index"
      :message="warning"
      show-icon
      type="warning"
    />

    <Card size="small" :title="$t('page.quantReports.detail.parity.title')">
      <SubjectParityPanel :report-id="report.recommendation_report_id" />
    </Card>
  </div>
</template>
