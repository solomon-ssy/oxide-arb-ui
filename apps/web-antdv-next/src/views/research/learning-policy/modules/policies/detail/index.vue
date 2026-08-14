<script lang="ts" setup>
import type { TableColumnsType } from 'antdv-next';

import type {
  SourceSliceObjectKind,
  TradePolicyDetailView,
  TradePolicyEvidenceObjectKind,
  TradePolicyEvidenceRowView,
  TradePolicyGovernanceAuditView,
  TradePolicySourceSliceObjectView,
  TradePolicySourceSliceView,
  TradePolicyValidationRowView,
  TradePolicyValidationRunView,
} from '@vben/types';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useRequestHandler } from '@vben/request/qp';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  Pagination,
  Select,
  SelectOption,
  Space,
  Table,
  Tag,
  Timeline,
  TimelineItem,
} from 'antdv-next';

import {
  getTradePolicy,
  getTradePolicyEvidenceDownload,
  getTradePolicySourceSlice,
  governTradePolicy,
  listTradePolicyAudits,
  listTradePolicyEvidenceRows,
  listTradePolicySourceSliceObjects,
  listTradePolicyValidationRows,
  listTradePolicyValidations,
  validateTradePolicy,
} from '#/api/trade-policies';
import { $t } from '#/locales';
import {
  formatBps,
  formatDateTimeLocal,
  formatPercent,
  formatPrice,
  formatUsd,
} from '#/shared/components/format';
import WorkspaceInspectorSurface from '#/shared/components/workspace/workspace-inspector-surface.vue';
import { useGovernedAction } from '#/shared/composables/use-governed-action';

defineOptions({ name: 'TradePolicyDetailPage' });

const route = useRoute();
const router = useRouter();
const { governed } = useGovernedAction();
const { handleRequest } = useRequestHandler();

const detail = ref<null | TradePolicyDetailView>(null);
const audits = ref<TradePolicyGovernanceAuditView[]>([]);
const auditPage = ref(1);
const auditTotal = ref(0);
const sourceSlice = ref<null | TradePolicySourceSliceView>(null);
const sourceObjects = ref<TradePolicySourceSliceObjectView[]>([]);
const sourceObjectPage = ref(1);
const sourceObjectTotal = ref(0);
const sourceObjectKind = ref<SourceSliceObjectKind>();
const validationRuns = ref<TradePolicyValidationRunView[]>([]);
const validationPage = ref(1);
const validationTotal = ref(0);
const selectedValidationId = ref<string>();
const validationRows = ref<TradePolicyValidationRowView[]>([]);
const validationRowPage = ref(1);
const validationRowTotal = ref(0);
const validationRowPassed = ref<boolean>();
const validationRowEvidenceKind = ref<TradePolicyEvidenceObjectKind>();
const evidenceRows = ref<TradePolicyEvidenceRowView[]>([]);
const evidenceRowKind = ref<TradePolicyEvidenceObjectKind>('fills');
const evidenceRowPage = ref(1);
const evidenceRowTotal = ref(0);
const loading = ref(false);
const artifactId = computed(() =>
  typeof route.query.id === 'string' ? route.query.id : '',
);
const inspectorOpen = computed({
  get: () => route.query.entity === 'trade-policy' && artifactId.value !== '',
  set: (value: boolean) => {
    if (!value) {
      void router.push('/research/learning-policy?module=policies');
    }
  },
});
const publicationBlocked = computed(
  () => (detail.value?.publication_blockers.length ?? 0) > 0,
);
const selectedValidation = computed(() =>
  validationRuns.value.find(
    (run) => run.validation_run_id === selectedValidationId.value,
  ),
);
const evidenceKinds: TradePolicyEvidenceObjectKind[] = [
  'observation_eligibility',
  'fills',
  'candidate_trials',
  'cohort_trials',
  'cpcv_paths',
  'coverage_gaps',
  'statistical_summaries',
  'vertical_gates',
  'structural_volatility_oos',
];
const sourceObjectKinds: SourceSliceObjectKind[] = [
  'catalog_market',
  'catalog_event',
  'clob_market_info',
  'l2_event',
  'l2_checkpoint',
  'l2_session',
  'l2_gap',
  'book_microstructure',
  'trade_tape',
  'market_linkage',
  'domain_observation',
  'crypto_price_report',
  'weather_observation',
  'weather_forecast',
  'calibration_reference',
  'resolution',
];
const sourceObjectColumns = computed<
  TableColumnsType<TradePolicySourceSliceObjectView>
>(() => [
  {
    dataIndex: 'kind',
    key: 'kind',
    title: $t('page.research.tradePolicies.detail.objectKind'),
    width: 180,
  },
  {
    dataIndex: 'row_count',
    key: 'row_count',
    title: $t('page.research.tradePolicies.detail.rows'),
    width: 110,
  },
  {
    key: 'event_range',
    title: $t('page.research.tradePolicies.detail.eventRange'),
    width: 260,
  },
  {
    key: 'object_identity',
    title: $t('page.research.tradePolicies.detail.objectIdentity'),
  },
]);
const validationColumns = computed<
  TableColumnsType<TradePolicyValidationRunView>
>(() => [
  {
    dataIndex: 'status',
    key: 'status',
    title: $t('page.research.tradePolicies.columns.status'),
    width: 120,
  },
  {
    key: 'row_counts',
    title: $t('page.research.tradePolicies.detail.rowCounts'),
    width: 180,
  },
  {
    dataIndex: 'reason',
    key: 'reason',
    title: $t('page.research.tradePolicies.detail.reason'),
  },
  {
    dataIndex: 'started_at',
    key: 'started_at',
    title: $t('page.research.tradePolicies.detail.startedAt'),
    width: 190,
  },
  {
    key: 'operation',
    title: $t('page.research.tradePolicies.columns.operation'),
    width: 100,
  },
]);
const validationRowColumns = computed<
  TableColumnsType<TradePolicyValidationRowView>
>(() => [
  {
    dataIndex: 'row_ordinal',
    key: 'row_ordinal',
    title: '#',
    width: 80,
  },
  {
    dataIndex: 'passed',
    key: 'passed',
    title: $t('page.research.tradePolicies.detail.result'),
    width: 100,
  },
  {
    dataIndex: 'evidence_kind',
    key: 'evidence_kind',
    title: $t('page.research.tradePolicies.detail.evidenceObject'),
    width: 180,
  },
  {
    dataIndex: 'record_key',
    key: 'record_key',
    title: $t('page.research.tradePolicies.detail.recordKey'),
    width: 300,
  },
  {
    dataIndex: 'decision_at',
    key: 'decision_at',
    title: $t('page.research.tradePolicies.detail.decisionAt'),
    width: 190,
  },
  {
    key: 'diagnostic',
    title: $t('page.research.tradePolicies.detail.diagnostic'),
  },
]);
const evidenceRowColumns = computed<
  TableColumnsType<TradePolicyEvidenceRowView>
>(() => [
  {
    dataIndex: 'record_key',
    key: 'record_key',
    title: $t('page.research.tradePolicies.detail.recordKey'),
    width: 300,
  },
  {
    dataIndex: 'event_at',
    key: 'event_at',
    title: $t('page.research.tradePolicies.detail.eventAt'),
    width: 190,
  },
  {
    dataIndex: 'payload',
    key: 'payload',
    title: $t('page.research.tradePolicies.detail.evidencePayload'),
  },
  {
    dataIndex: 'row_hash',
    key: 'row_hash',
    title: $t('page.research.tradePolicies.detail.rowHash'),
    width: 300,
  },
]);

function statusColor(status: TradePolicyValidationRunView['status']) {
  if (status === 'succeeded') return 'success';
  if (status === 'failed') return 'error';
  if (status === 'cancelled') return 'default';
  return 'processing';
}

async function loadSourceObjects(page = sourceObjectPage.value) {
  const result = await handleRequest(
    () =>
      listTradePolicySourceSliceObjects(artifactId.value, {
        kind: sourceObjectKind.value,
        page,
        size: 25,
      }),
    { silent: true },
  );
  sourceObjectPage.value = result?.page ?? page;
  sourceObjectTotal.value = result?.total ?? 0;
  sourceObjects.value = result?.items ?? [];
}

async function loadValidationRows(
  validationRunId = selectedValidationId.value,
  page = validationRowPage.value,
) {
  if (!validationRunId) {
    validationRows.value = [];
    validationRowTotal.value = 0;
    return;
  }
  selectedValidationId.value = validationRunId;
  const result = await handleRequest(
    () =>
      listTradePolicyValidationRows(validationRunId, {
        page,
        evidence_kind: validationRowEvidenceKind.value,
        passed: validationRowPassed.value,
        size: 50,
      }),
    { silent: true },
  );
  validationRowPage.value = result?.page ?? page;
  validationRowTotal.value = result?.total ?? 0;
  validationRows.value = result?.items ?? [];
}

async function loadValidationRuns(page = validationPage.value) {
  const result = await handleRequest(
    () =>
      listTradePolicyValidations(artifactId.value, {
        page,
        size: 20,
      }),
    { silent: true },
  );
  validationPage.value = result?.page ?? page;
  validationTotal.value = result?.total ?? 0;
  validationRuns.value = result?.items ?? [];
  const selectedStillVisible = validationRuns.value.some(
    (run) => run.validation_run_id === selectedValidationId.value,
  );
  if (!selectedStillVisible) {
    selectedValidationId.value = validationRuns.value[0]?.validation_run_id;
    validationRowPage.value = 1;
  }
  await loadValidationRows();
}

async function loadEvidenceRows(page = evidenceRowPage.value) {
  const result = await handleRequest(
    () =>
      listTradePolicyEvidenceRows(artifactId.value, evidenceRowKind.value, {
        page,
        size: 25,
      }),
    { silent: true },
  );
  evidenceRowPage.value = result?.page ?? page;
  evidenceRowTotal.value = result?.total ?? 0;
  evidenceRows.value = result?.items ?? [];
}

async function loadAudits(page = auditPage.value) {
  const result = await handleRequest(
    () => listTradePolicyAudits(artifactId.value, { page, size: 20 }),
    { silent: true },
  );
  auditPage.value = result?.page ?? page;
  auditTotal.value = result?.total ?? 0;
  audits.value = result?.items ?? [];
}

async function load() {
  if (!artifactId.value) return;
  loading.value = true;
  try {
    const [policy, slice] = await Promise.all([
      handleRequest(() => getTradePolicy(artifactId.value)),
      handleRequest(() => getTradePolicySourceSlice(artifactId.value), {
        silent: true,
      }),
    ]);
    detail.value = policy ?? null;
    sourceSlice.value = slice ?? null;
    await Promise.all([
      loadAudits(1),
      loadEvidenceRows(1),
      loadSourceObjects(1),
      loadValidationRuns(1),
    ]);
  } finally {
    loading.value = false;
  }
}

async function transition(action: 'publish' | 'retire') {
  const current = detail.value;
  if (!current) return;
  const updated = await governed(
    (context) =>
      governTradePolicy(
        current.artifact_id,
        action,
        { reason: context.reason },
        context,
      ),
    {
      danger: action === 'retire',
      summary: $t(`page.research.tradePolicies.governance.${action}Summary`),
      title: $t(`page.research.tradePolicies.governance.${action}`),
    },
  );
  if (updated) await load();
}

async function enqueueValidation() {
  const current = detail.value;
  if (!current) return;
  const job = await governed(
    (context) =>
      validateTradePolicy(
        current.artifact_id,
        { reason: context.reason },
        context,
      ),
    {
      summary: $t('page.research.tradePolicies.governance.validateSummary'),
      title: $t('page.research.tradePolicies.governance.validate'),
    },
  );
  if (job) {
    await router.push(
      `/runtime/activity?entity=research-job&id=${encodeURIComponent(job.job_id)}`,
    );
  }
}

async function selectValidation(validationRunId: string) {
  validationRowPage.value = 1;
  await loadValidationRows(validationRunId, 1);
}

async function filterSourceObjects() {
  sourceObjectPage.value = 1;
  await loadSourceObjects(1);
}

async function filterValidationRows() {
  validationRowPage.value = 1;
  await loadValidationRows(selectedValidationId.value, 1);
}

async function selectEvidenceKind() {
  evidenceRowPage.value = 1;
  await loadEvidenceRows(1);
}

async function downloadEvidence(kind: TradePolicyEvidenceObjectKind) {
  const view = await handleRequest(() =>
    getTradePolicyEvidenceDownload(artifactId.value, kind),
  );
  if (!view) return;
  const anchor = document.createElement('a');
  anchor.href = view.url;
  anchor.rel = 'noopener noreferrer';
  anchor.target = '_blank';
  anchor.click();
}

function blockerLabel(kind: string) {
  return $t(`page.research.tradePolicies.blocker.${kind}`);
}

onMounted(load);
</script>

<template>
  <WorkspaceInspectorSurface
    v-model:open="inspectorOpen"
    :loading="loading"
    :title="$t('page.research.tradePolicies.detail.title')"
  >
    <p class="mb-4 text-sm text-muted-foreground">
      {{ $t('page.research.tradePolicies.detail.subtitle') }}
    </p>
    <div class="mb-4 flex justify-end">
      <Space>
        <Button
          @click="router.push('/research/learning-policy?module=policies')"
        >
          {{ $t('common.back') }}
        </Button>
        <Button
          v-if="detail?.allowed_governance_actions.includes('validate')"
          type="primary"
          @click="enqueueValidation"
        >
          {{ $t('page.research.tradePolicies.governance.validate') }}
        </Button>
        <Button
          v-if="detail?.allowed_governance_actions.includes('publish')"
          type="primary"
          @click="transition('publish')"
        >
          {{ $t('page.research.tradePolicies.governance.publish') }}
        </Button>
        <Button
          v-if="detail?.allowed_governance_actions.includes('retire')"
          danger
          @click="transition('retire')"
        >
          {{ $t('page.research.tradePolicies.governance.retire') }}
        </Button>
      </Space>
    </div>

    <Empty v-if="!loading && !detail" />

    <div
      v-else-if="detail"
      aria-live="polite"
      class="detail-layout"
      data-testid="trade-policy-detail"
    >
      <Card :title="$t('page.research.tradePolicies.detail.overviewReadiness')">
        <Alert
          v-if="publicationBlocked"
          :description="
            $t('page.research.tradePolicies.detail.publicationBlocked')
          "
          :message="$t('page.research.tradePolicies.detail.blockedTitle')"
          show-icon
          type="warning"
        />
        <Alert
          v-else
          :message="$t('page.research.tradePolicies.detail.readyTitle')"
          show-icon
          type="success"
        />
        <Descriptions
          :column="1"
          :label-style="{ width: '38%' }"
          bordered
          class="overview-descriptions mt-4"
          size="small"
        >
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.columns.status')"
          >
            <Tag>{{ detail.status }}</Tag>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.workbench.profile')"
          >
            {{ detail.payload.fit_contract.profile_ref.id }}@{{
              detail.payload.fit_contract.profile_ref.version
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.workbench.evaluationTrack')"
          >
            <Tag>{{ detail.payload.fit_contract.evaluation_track }}</Tag>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.detail.fitWindow')"
          >
            <span data-screenshot-volatile="true">
              {{
                formatDateTimeLocal(
                  detail.payload.fit_contract.fit_window_start,
                )
              }}
              →
              {{
                formatDateTimeLocal(detail.payload.fit_contract.fit_window_end)
              }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.workbench.cashBudget')"
          >
            <Space>
              <Tag
                v-for="tier in detail.payload.fit_contract.cash_budget_tiers"
                :key="tier"
                color="blue"
              >
                {{ formatUsd(tier) }}
              </Tag>
            </Space>
          </DescriptionsItem>
        </Descriptions>
        <div v-if="publicationBlocked" class="blocker-grid mt-4">
          <Alert
            v-for="(blocker, index) in detail.publication_blockers"
            :key="`${blocker.kind}-${index}`"
            :message="blockerLabel(blocker.kind)"
            show-icon
            type="error"
          />
        </div>
      </Card>

      <Card :title="$t('page.research.tradePolicies.detail.validation')">
        <Descriptions :column="2" bordered size="small">
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.detail.dsr')"
          >
            {{ formatPercent(detail.payload.validation.deflated_sharpe_ratio) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.detail.pbo')"
          >
            {{
              formatPercent(
                detail.payload.validation.probability_of_backtest_overfitting,
              )
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.detail.cpcvPaths')"
          >
            {{ detail.payload.validation.cpcv_path_count ?? '—' }} / 21
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.detail.ess')"
          >
            {{ detail.payload.validation.effective_sample_size ?? '—' }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.detail.commonSupport')"
          >
            {{
              formatPercent(detail.payload.validation.common_candidate_support)
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.detail.feeCoverage')"
          >
            {{ formatPercent(detail.payload.validation.fee_catalog_coverage) }}
          </DescriptionsItem>
        </Descriptions>

        <div class="cohort-grid mt-4">
          <Card
            v-for="(cohort, index) in detail.payload.cohorts"
            :key="index"
            size="small"
          >
            <div class="cohort-title">
              <strong>
                {{ cohort.key.category }} · {{ cohort.key.horizon_secs }}s ·
                {{ formatUsd(cohort.key.cash_budget_tier) }}
              </strong>
              <Tag>{{ cohort.selected_candidate_id }}</Tag>
            </div>
            <p class="muted">
              {{ formatPrice(cohort.key.entry_price_min) }}–{{
                formatPrice(cohort.key.entry_price_max)
              }}
              · {{ cohort.key.liquidity.bucket_id }} ·
              {{ cohort.key.volatility.bucket_id }}
            </p>
            <p>
              +{{ formatBps(cohort.upper_barrier_bps) }} /
              {{ formatBps(cohort.lower_barrier_bps) }} · coverage
              {{ formatPercent(cohort.executable_coverage) }} · ESS
              {{ cohort.effective_sample_size }}
            </p>
          </Card>
          <Empty v-if="detail.payload.cohorts.length === 0" />
        </div>
      </Card>

      <Card
        :title="$t('page.research.tradePolicies.detail.validationRuns')"
        data-testid="trade-policy-validation-runs"
      >
        <Table
          :columns="validationColumns"
          :data-source="validationRuns"
          :pagination="false"
          :row-key="(row) => row.validation_run_id"
          :scroll="{ x: 900 }"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <Tag
              v-if="column.key === 'status'"
              :color="statusColor(record.status)"
            >
              {{ record.status }}
            </Tag>
            <span v-else-if="column.key === 'row_counts'">
              {{ record.passed_rows }} / {{ record.total_rows }}
              <Tag v-if="record.failed_rows > 0" color="error">
                {{ record.failed_rows }}
                {{ $t('page.research.tradePolicies.detail.failedRows') }}
              </Tag>
            </span>
            <span v-else-if="column.key === 'started_at'">
              {{ formatDateTimeLocal(record.started_at) }}
            </span>
            <Button
              v-else-if="column.key === 'operation'"
              size="small"
              type="link"
              @click="selectValidation(record.validation_run_id)"
            >
              {{ $t('page.research.tradePolicies.detail.inspectRows') }}
            </Button>
          </template>
        </Table>
        <Pagination
          v-if="validationTotal > 20"
          v-model:current="validationPage"
          :page-size="20"
          :show-size-changer="false"
          :total="validationTotal"
          class="table-pagination"
          @change="loadValidationRuns"
        />

        <div v-if="selectedValidation" class="validation-row-section">
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.research.tradePolicies.detail.validationHash')"
            >
              <span class="mono">{{
                selectedValidation.validation_hash ?? '—'
              }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.tradePolicies.detail.evidenceBinding')"
            >
              <span class="mono">
                {{ selectedValidation.source_slice_manifest_hash }} /
                {{ selectedValidation.evidence_manifest_hash }}
              </span>
            </DescriptionsItem>
          </Descriptions>
          <Alert
            v-if="selectedValidation.failure_detail"
            :message="selectedValidation.failure_detail"
            class="mt-3"
            show-icon
            type="error"
          />
          <div class="table-toolbar">
            <h3 class="section-title">
              {{ $t('page.research.tradePolicies.detail.rowDiagnostics') }}
            </h3>
            <Select
              v-model:value="validationRowEvidenceKind"
              allow-clear
              :placeholder="
                $t('page.research.tradePolicies.detail.allEvidenceKinds')
              "
              style="width: 220px"
              @change="filterValidationRows"
            >
              <SelectOption
                v-for="kind in evidenceKinds"
                :key="kind"
                :value="kind"
              >
                {{ $t(`page.research.tradePolicies.evidenceKind.${kind}`) }}
              </SelectOption>
            </Select>
            <Select
              v-model:value="validationRowPassed"
              allow-clear
              :placeholder="
                $t('page.research.tradePolicies.detail.allValidationResults')
              "
              style="width: 190px"
              @change="filterValidationRows"
            >
              <SelectOption :value="true">
                {{ $t('page.research.tradePolicies.detail.passedOnly') }}
              </SelectOption>
              <SelectOption :value="false">
                {{ $t('page.research.tradePolicies.detail.failedOnly') }}
              </SelectOption>
            </Select>
          </div>
          <Table
            :columns="validationRowColumns"
            :data-source="validationRows"
            data-testid="trade-policy-validation-rows"
            :pagination="false"
            :row-key="(row) => `${row.validation_run_id}-${row.row_ordinal}`"
            :scroll="{ x: 1180 }"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <Tag
                v-if="column.key === 'passed'"
                :color="record.passed ? 'success' : 'error'"
              >
                {{
                  record.passed
                    ? $t('page.research.tradePolicies.detail.pass')
                    : $t('page.research.tradePolicies.detail.fail')
                }}
              </Tag>
              <span v-else-if="column.key === 'decision_at'">
                {{
                  record.decision_at
                    ? formatDateTimeLocal(record.decision_at)
                    : '—'
                }}
              </span>
              <Tag v-else-if="column.key === 'evidence_kind'">
                {{
                  $t(
                    `page.research.tradePolicies.evidenceKind.${record.evidence_kind}`,
                  )
                }}
              </Tag>
              <span v-else-if="column.key === 'record_key'" class="mono">
                {{ record.record_key }}
              </span>
              <div v-else-if="column.key === 'diagnostic'">
                <strong>{{ record.diagnostic_kind ?? '—' }}</strong>
                <div class="muted">{{ record.detail ?? '—' }}</div>
                <div class="mono muted">
                  expected: {{ record.expected_row_hash ?? '—' }}
                </div>
                <div class="mono muted">
                  actual: {{ record.actual_row_hash ?? '—' }}
                </div>
                <div class="mono muted">{{ record.row_hash }}</div>
              </div>
            </template>
          </Table>
          <Pagination
            v-if="validationRowTotal > 50"
            v-model:current="validationRowPage"
            :page-size="50"
            :show-size-changer="false"
            :total="validationRowTotal"
            class="table-pagination"
            @change="(page) => loadValidationRows(selectedValidationId, page)"
          />
        </div>
        <Empty v-else-if="validationRuns.length === 0" />
      </Card>

      <Card :title="$t('page.research.tradePolicies.detail.executionEvidence')">
        <Descriptions :column="2" bordered size="small">
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.detail.entryBasis')"
          >
            {{ detail.payload.execution_evidence.entry_basis ?? '—' }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.detail.exitBasis')"
          >
            {{ detail.payload.execution_evidence.exit_basis ?? '—' }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.detail.fullL2Coverage')"
          >
            {{
              formatPercent(detail.payload.execution_evidence.full_l2_coverage)
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.detail.feeModel')"
          >
            <span class="mono">{{
              detail.payload.execution_evidence.fee_model_hash ?? '—'
            }}</span>
          </DescriptionsItem>
        </Descriptions>
        <Alert
          v-for="reason in detail.payload.execution_evidence.gaps"
          :key="reason"
          :message="reason"
          class="mt-3"
          show-icon
          type="warning"
        />
        <div class="evidence-actions mt-4">
          <Button
            v-for="kind in evidenceKinds"
            :key="kind"
            :data-testid="`evidence-download-${kind}`"
            :disabled="!detail.payload.evidence_bundle"
            size="small"
            @click="downloadEvidence(kind)"
          >
            {{ $t(`page.research.tradePolicies.evidenceKind.${kind}`) }}
          </Button>
        </div>
        <div class="table-toolbar mt-4">
          <h3 class="section-title">
            {{ $t('page.research.tradePolicies.detail.evidenceDrilldown') }}
          </h3>
          <Select
            v-model:value="evidenceRowKind"
            style="width: 240px"
            @change="selectEvidenceKind"
          >
            <SelectOption
              v-for="kind in evidenceKinds"
              :key="kind"
              :value="kind"
            >
              {{ $t(`page.research.tradePolicies.evidenceKind.${kind}`) }}
            </SelectOption>
          </Select>
        </div>
        <Table
          :columns="evidenceRowColumns"
          :data-source="evidenceRows"
          data-testid="trade-policy-evidence-rows"
          :pagination="false"
          :row-key="(row) => `${row.kind}-${row.record_key}`"
          :scroll="{ x: 1280 }"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <span v-if="column.key === 'record_key'" class="mono">
              {{ record.record_key }}
            </span>
            <span v-else-if="column.key === 'event_at'">
              {{ record.event_at ? formatDateTimeLocal(record.event_at) : '—' }}
            </span>
            <pre
              v-else-if="column.key === 'payload'"
              class="evidence-payload"
              v-text="JSON.stringify(record.payload, null, 2)"
            ></pre>
            <span v-else-if="column.key === 'row_hash'" class="mono">
              {{ record.row_hash }}
            </span>
          </template>
        </Table>
        <Pagination
          v-if="evidenceRowTotal > 25"
          v-model:current="evidenceRowPage"
          :page-size="25"
          :show-size-changer="false"
          :total="evidenceRowTotal"
          class="table-pagination"
          @change="loadEvidenceRows"
        />
      </Card>

      <Card
        :title="$t('page.research.tradePolicies.detail.sourceSliceObjects')"
        data-testid="trade-policy-source-slice-objects"
      >
        <template #extra>
          <Select
            v-model:value="sourceObjectKind"
            allow-clear
            :placeholder="
              $t('page.research.tradePolicies.detail.allObjectKinds')
            "
            style="width: 220px"
            @change="filterSourceObjects"
          >
            <SelectOption
              v-for="kind in sourceObjectKinds"
              :key="kind"
              :value="kind"
            >
              {{ kind }}
            </SelectOption>
          </Select>
        </template>
        <Descriptions v-if="sourceSlice" :column="1" bordered size="small">
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.workbench.profile')"
          >
            {{ sourceSlice.profile_ref.id }}@{{
              sourceSlice.profile_ref.version
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.detail.manifestHash')"
          >
            <span class="mono">{{
              sourceSlice.source_slice.manifest_hash
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.detail.manifestUri')"
          >
            <span class="mono">{{
              sourceSlice.source_slice.manifest_uri
            }}</span>
          </DescriptionsItem>
        </Descriptions>
        <Table
          :columns="sourceObjectColumns"
          :data-source="sourceObjects"
          :pagination="false"
          :row-key="(row) => `${row.kind}-${row.byte_hash}`"
          :scroll="{ x: 980 }"
          class="mt-4"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <Tag v-if="column.key === 'kind'">{{ record.kind }}</Tag>
            <div v-else-if="column.key === 'event_range'">
              <div>{{ formatDateTimeLocal(record.min_event_at) }}</div>
              <div>→ {{ formatDateTimeLocal(record.max_event_at) }}</div>
              <div class="muted">
                {{ $t('page.research.tradePolicies.detail.availableThrough') }}:
                {{ formatDateTimeLocal(record.max_available_at) }}
              </div>
            </div>
            <div v-else-if="column.key === 'object_identity'">
              <div class="mono">{{ record.uri }}</div>
              <div class="mono muted">
                v={{ record.object_version }} · BLAKE3={{ record.byte_hash }}
              </div>
              <div class="mono muted">schema={{ record.schema_hash }}</div>
            </div>
          </template>
        </Table>
        <Pagination
          v-if="sourceObjectTotal > 25"
          v-model:current="sourceObjectPage"
          :page-size="25"
          :show-size-changer="false"
          :total="sourceObjectTotal"
          class="table-pagination"
          @change="loadSourceObjects"
        />
      </Card>

      <Card :title="$t('page.research.tradePolicies.detail.lineageAudit')">
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.columns.artifactId')"
          >
            <span class="mono">{{ detail.artifact_id }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.detail.hash')"
          >
            <span class="mono">{{ detail.content_hash }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.columns.dataset')"
          >
            <span class="mono">{{ detail.source_dataset_id }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.workbench.programHash')"
          >
            <span class="mono">{{
              detail.payload.fit_contract.research_program_hash
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.workbench.sourceSlice')"
          >
            <span class="mono">{{
              detail.payload.evidence_bundle?.source_slice_manifest_hash ?? '—'
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.detail.trialLedger')"
          >
            <span class="mono">{{
              detail.payload.validation.trial_ledger_hash ?? '—'
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.detail.evidenceManifest')"
          >
            <span class="mono">{{
              detail.payload.evidence_bundle?.manifest_hash ?? '—'
            }}</span>
          </DescriptionsItem>
        </Descriptions>

        <h3 class="section-title">
          {{ $t('page.research.tradePolicies.detail.audit') }}
        </h3>
        <Timeline v-if="audits.length > 0" data-testid="trade-policy-audit">
          <TimelineItem v-for="audit in audits" :key="audit.audit_id">
            <div class="audit-row">
              <strong>{{ audit.from_status }} → {{ audit.to_status }}</strong>
              <span>{{ audit.reason }}</span>
              <span class="muted">
                {{ audit.actor_id }} ·
                {{ formatDateTimeLocal(audit.created_at) }}
              </span>
            </div>
          </TimelineItem>
        </Timeline>
        <Empty v-else />
        <Pagination
          v-if="auditTotal > 20"
          v-model:current="auditPage"
          :page-size="20"
          :show-size-changer="false"
          :total="auditTotal"
          class="table-pagination"
          @change="loadAudits"
        />
      </Card>
    </div>
  </WorkspaceInspectorSurface>
</template>

<style scoped>
.detail-layout {
  display: grid;
  gap: 20px;
  min-width: 0;
}

.overview-descriptions :deep(table) {
  table-layout: fixed;
}

.blocker-grid,
.cohort-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.cohort-title {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.audit-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.evidence-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.evidence-payload {
  max-height: 260px;
  padding: 8px;
  margin: 0;
  overflow: auto;
  font-size: 12px;
  white-space: pre-wrap;
  background: var(--ant-color-fill-quaternary);
  border-radius: 4px;
}

.section-title {
  margin: 20px 0 12px;
  font-size: 14px;
  font-weight: 600;
}

.table-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.validation-row-section {
  display: grid;
  gap: 12px;
  margin-top: 20px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.muted {
  font-size: 12px;
  color: var(--muted-foreground);
}

@media (max-width: 900px) {
  .blocker-grid,
  .cohort-grid {
    grid-template-columns: 1fr;
  }
}
</style>
