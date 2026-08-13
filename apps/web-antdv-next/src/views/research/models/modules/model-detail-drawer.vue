<script lang="ts" setup>
import type {
  BacktestPathSetView,
  BacktestReportView,
  ModelDetailView,
  ModelRouteBootstrapReceiptView,
  QualityGateReportView,
  ResearchJobView,
  ReturnModelView,
  RuntimeControlSnapshot,
  TrainedModelView,
} from '@vben/types';
import type {
  ConfigResourcesView,
  CurrentPolicyResourceView,
} from '@vben/types/config-api';

import type { BacktestBody } from './model-backtest-modal.vue';
import type { CpcvBody } from './model-cpcv-modal.vue';

import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';
import { isActiveResearchJobStatus, RESEARCH_JOB_KINDS } from '@vben/types';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  message,
  Pagination,
  Select,
  Space,
  Spin,
  TabPane,
  Tabs,
  Tag,
} from 'antdv-next';

import { getConfigResources, getCurrentConfigResource } from '#/api/config';
import { bootstrapModelRoute } from '#/api/feedback';
import {
  backtestModel,
  cpcvBacktestModel,
  getBacktestPathSet,
  getModel,
  getModelQualityGate,
  listBacktestPathSets,
  listBacktestReports,
  listResearchJobs,
} from '#/api/research';
import { getRuntimeControls } from '#/api/system';
import { $t } from '#/locales';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import FeatureParityStatusPanel from '#/shared/components/feature-parity-status-panel.vue';
import { formatDateTimeLocal } from '#/shared/components/format';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useResearchStore } from '#/store';

import CopyableHash from '../../shared/copyable-hash.vue';
import CpcvValidationPanel from '../../shared/cpcv-validation-panel.vue';
import QualityGateScorecard from '../../shared/quality-gate-scorecard.vue';
import ModelBacktestModal from './model-backtest-modal.vue';
import ModelCpcvModal from './model-cpcv-modal.vue';
import ModelMetricsPanel from './model-metrics-panel.vue';
import {
  modelServingCommitments,
  modelServingLineage,
} from './model-serving-lineage';

defineOptions({ name: 'ModelDetailDrawer' });

interface ModelDrawerData {
  model: TrainedModelView;
}

const { handleRequest } = useRequestHandler();
const { governed } = useGovernedAction();
const { hasAccessByCodes } = useQpAccess();
const route = useRoute();
const router = useRouter();
const researchStore = useResearchStore();
const canReplay = hasAccessByCodes(['replay:create']);
const canBootstrapRoute = hasAccessByCodes(['publication:publish']);

/** Sell family has lot-level CPCV only — no Buy-style single-path backtest. */
const SELL_MODEL_FAMILY = 'hold_vs_exit_weighted';

const model = ref<null | TrainedModelView>(null);
const modelDetail = ref<ModelDetailView | null>(null);
const modelFamily = ref<null | string>(null);
const isSellFamily = computed(
  () =>
    modelFamily.value === SELL_MODEL_FAMILY ||
    model.value?.model_family === SELL_MODEL_FAMILY,
);
const showSinglePathBacktest = computed(() => canReplay && !isSellFamily.value);
const dualTrackHint = computed(() =>
  isSellFamily.value
    ? $t('page.research.models.cpcv.sellDualTrackHint')
    : $t('page.research.models.cpcv.dualTrackHint'),
);
const backtests = ref<BacktestReportView[]>([]);
const pathSets = ref<BacktestPathSetView[]>([]);
const pathSet = ref<BacktestPathSetView | null>(null);
const selectedPathSetId = ref<null | string>(null);
const activeCpcvJob = ref<null | ResearchJobView>(null);
const gate = ref<null | QualityGateReportView>(null);
const configResources = ref<ConfigResourcesView | null>(null);
const routingResource = ref<CurrentPolicyResourceView | null>(null);
const runtimeControls = ref<null | RuntimeControlSnapshot>(null);
const bootstrapReceipt = ref<ModelRouteBootstrapReceiptView | null>(null);
const bootstrapError = ref<null | string>(null);
const bootstrapLoading = ref(false);
const bootstrapIdempotencyKey = ref(crypto.randomUUID());
const loading = ref(false);
const gateLoading = ref(false);
const openId = ref<null | string>(null);
const evaluationPage = ref(1);
const EVALUATION_PAGE_SIZE = 20;
const activeDetailTab = ref('input-contract');
const detailTabOptions = computed(() => [
  {
    label: $t('page.research.models.detail.artifactLineage'),
    value: 'input-contract',
  },
  {
    label: $t('page.research.models.detail.servingContract'),
    value: 'serving-contract',
  },
  {
    label: $t('page.research.models.detail.parity'),
    value: 'parity',
  },
  {
    label: $t('page.research.models.detail.tradePolicy'),
    value: 'trade-policy',
  },
]);

const metrics = computed(() => model.value?.metrics);
const servingLineage = computed(() =>
  modelDetail.value ? modelServingLineage(modelDetail.value) : null,
);
const servingCommitments = computed(() =>
  modelDetail.value ? modelServingCommitments(modelDetail.value) : null,
);
const detailAnnouncement = computed(() => {
  if (loading.value) {
    return $t('page.research.models.detail.loadingAnnouncement');
  }
  if (!modelDetail.value) {
    return $t('page.research.models.detail.loadFailedAnnouncement');
  }
  if (gateLoading.value) {
    return $t('page.research.models.detail.readinessLoadingAnnouncement');
  }
  return gate.value
    ? $t('page.research.models.detail.loadedAnnouncement')
    : $t('page.research.models.detail.readinessUnavailableAnnouncement');
});

const cpcvInProgress = computed(() => !!activeCpcvJob.value);

const bootstrapRoute = computed<'crypto' | 'pooled' | 'weather' | null>(() => {
  const detail = modelDetail.value;
  if (!detail) {
    return null;
  }
  const category = detail.serving_contract.bindings.model.category_scope;
  if (category === null) {
    return 'pooled';
  }
  return category === 'crypto' || category === 'weather' ? category : null;
});

const bootstrapRouteLabel = computed(() => {
  const route = bootstrapRoute.value;
  return route ? $t(`page.research.models.bootstrap.routes.${route}`) : '—';
});

const routedModelId = computed(() => {
  const revision = routingResource.value?.revision;
  const route = bootstrapRoute.value;
  if (
    !revision ||
    revision.document.resource_kind !== 'model_routing' ||
    !route
  ) {
    return null;
  }
  const model = revision.document.document.model;
  return model?.buy_routes?.[route]?.champion.model_version_id ?? null;
});

const bootstrapPrerequisitesReady = computed(() => {
  const detail = modelDetail.value;
  return (
    canBootstrapRoute &&
    bootstrapRoute.value !== null &&
    routedModelId.value === null &&
    gate.value?.passed === true &&
    runtimeControls.value?.quant_runtime_mode === 'report_only' &&
    detail?.serving_contract.bindings.model.calibration !== null &&
    configResources.value !== null &&
    routingResource.value?.revision !== null &&
    runtimeControls.value !== null
  );
});

const bootstrapStateUnavailable = computed(
  () =>
    !configResources.value ||
    !routingResource.value?.revision ||
    !runtimeControls.value,
);

/** Need to run CPCV: no path sets yet, or alpha metrics fail on a bound set. */
const needsCpcvRunCta = computed(() => {
  const report = gate.value;
  if (!report || report.passed || !canReplay) {
    return false;
  }
  const hardFails = report.gates.filter(
    (out) => out.class === 'hard' && out.status === 'fail',
  );
  const missingPathSet = hardFails.some((out) => out.gate === 'cpcv_required');
  if (missingPathSet && pathSets.value.length === 0) {
    return true;
  }
  // Alpha-metric failures require a new CPCV run; path selection is diagnostic only.
  const alphaFail = hardFails.some(
    (out) =>
      out.gate === 'pbo' ||
      out.gate === 'deflated_sharpe' ||
      out.gate === 'rank_ic' ||
      out.gate === 'max_drawdown' ||
      out.gate === 'tail_loss_budget' ||
      out.gate === 'sell_baseline_uplift',
  );
  return alphaFail;
});

const cpcvGateOutcomes = computed(() => {
  const ids = new Set([
    'cpcv_required',
    'deflated_sharpe',
    'pbo',
    'rank_ic',
    ...(isSellFamily.value
      ? (['max_drawdown', 'tail_loss_budget', 'sell_baseline_uplift'] as const)
      : []),
  ]);
  return (gate.value?.gates ?? []).filter((row) => ids.has(row.gate));
});

const returnModel = computed<null | ReturnModelView>(
  () => model.value?.return_model ?? null,
);

function field(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  return String(value);
}

const trainingObjective = computed(
  () => model.value?.training_objective ?? null,
);
const trainingObjectiveDefinition = computed(
  () => trainingObjective.value?.definition ?? null,
);
const learningToRankObjective = computed(() =>
  trainingObjectiveDefinition.value?.kind === 'learning_to_rank'
    ? trainingObjectiveDefinition.value.spec
    : null,
);

const modelMetricsDefinition = computed(() => metrics.value?.definition);
const artifactLineage = computed(() => {
  const definition = modelMetricsDefinition.value;
  return definition?.kind === 'learning_to_rank' ||
    definition?.kind === 'classical_pointwise'
    ? definition.artifact_lineage
    : null;
});
const serializedModelHash = computed(() =>
  artifactLineage.value?.kind === 'fitted_feature_matrix'
    ? artifactLineage.value.serialized_model_hash
    : null,
);
const serializationFormat = computed(() =>
  artifactLineage.value?.kind === 'fitted_feature_matrix'
    ? artifactLineage.value.serialization_format
    : null,
);
const factorInputs = computed(() =>
  artifactLineage.value?.kind === 'factor_native'
    ? artifactLineage.value.factor_inputs
    : [],
);

const isCalibratedReturnModel = computed(
  () => returnModel.value?.calibration === 'calibrated',
);

const [BacktestModal, backtestModalApi] = useVbenModal({
  connectedComponent: ModelBacktestModal,
});
const [CpcvModal, cpcvModalApi] = useVbenModal({
  connectedComponent: ModelCpcvModal,
});

function openBacktest() {
  const current = model.value;
  if (!current) {
    return;
  }
  backtestModalApi
    .setData({
      modelSpecId: current.model_spec_id,
      modelVersionId: current.model_version_id,
      onSubmit: (body: BacktestBody) =>
        submitBacktest(current.model_version_id, body),
    })
    .open();
}

function openCpcv() {
  const current = model.value;
  if (!current) {
    return;
  }
  cpcvModalApi
    .setData({
      modelSpecId: current.model_spec_id,
      modelVersionId: current.model_version_id,
      onSubmit: (body: CpcvBody) => submitCpcv(current.model_version_id, body),
      trainingDatasetId: current.training_dataset_id ?? undefined,
    })
    .open();
}

async function submitBacktest(
  modelVersionId: string,
  body: BacktestBody,
): Promise<boolean> {
  const result = await governed(
    (ctx) =>
      backtestModel(modelVersionId, { ...body, reason: ctx.reason }, ctx),
    {
      summary: $t('page.research.models.backtest.summary'),
      title: $t('page.research.models.backtest.title'),
    },
  );
  if (result) {
    message.success($t('page.research.models.backtest.feedback'));
    await router.push(`/research/jobs?open=${result.job_id}`);
    return true;
  }
  return false;
}

async function submitCpcv(
  modelVersionId: string,
  body: CpcvBody,
): Promise<boolean> {
  const result = await governed(
    (ctx) =>
      cpcvBacktestModel(modelVersionId, { ...body, reason: ctx.reason }, ctx),
    {
      summary: $t('page.research.models.cpcv.summary'),
      title: $t('page.research.models.cpcv.title'),
    },
  );
  if (result) {
    message.success($t('page.research.models.cpcv.feedback'));
    await refresh(modelVersionId);
    return true;
  }
  return false;
}

async function bootstrapFirstChampion() {
  const current = modelDetail.value;
  const policy = configResources.value;
  const runtime = runtimeControls.value;
  const targetRoute = bootstrapRoute.value;
  if (
    !current ||
    !policy ||
    !runtime ||
    !targetRoute ||
    !bootstrapPrerequisitesReady.value
  ) {
    bootstrapError.value = $t(
      'page.research.models.bootstrap.prerequisitesFailed',
    );
    return;
  }
  bootstrapLoading.value = true;
  bootstrapError.value = null;
  try {
    const result = await governed(
      (ctx) =>
        bootstrapModelRoute(
          {
            expected_policy_generation: policy.active_bundle_generation,
            expected_runtime_control_revision: runtime.revision,
            idempotency_key: bootstrapIdempotencyKey.value,
            model_version_id: current.model_version_id,
            note: ctx.reason,
            reason_code: 'first_champion_bootstrap',
          },
          ctx,
        ),
      {
        danger: true,
        details: [
          {
            label: $t('page.research.models.bootstrap.route'),
            value: bootstrapRouteLabel.value,
          },
          {
            label: $t('page.research.models.bootstrap.model'),
            mono: true,
            value: current.model_version_id,
          },
          {
            label: $t('page.research.models.bootstrap.generation'),
            mono: true,
            value: `${policy.active_bundle_generation} → ${
              policy.active_bundle_generation + 1
            }`,
          },
          {
            label: $t('page.research.models.bootstrap.authority'),
            value: $t('page.research.models.bootstrap.authorityUnchanged'),
          },
        ],
        summary: $t('page.research.models.bootstrap.summary'),
        title: $t('page.research.models.bootstrap.title'),
      },
    );
    if (!result) {
      bootstrapError.value = $t('page.research.models.bootstrap.failed');
      return;
    }
    bootstrapReceipt.value = result;
    message.success($t('page.research.models.bootstrap.succeeded'));
    bootstrapIdempotencyKey.value = crypto.randomUUID();
    await refresh(current.model_version_id);
  } finally {
    bootstrapLoading.value = false;
  }
}

async function selectPathSet(id: string) {
  selectedPathSetId.value = id;
  const fromList = pathSets.value.find((row) => row.path_set_id === id);
  if (fromList) {
    pathSet.value = fromList;
    return;
  }
  const fetched = await handleRequest(() => getBacktestPathSet(id), {
    silent: true,
  });
  if (fetched && openId.value) {
    pathSet.value = fetched;
  }
}

async function refresh(id: string) {
  loading.value = true;
  gate.value = null;
  try {
    const [fresh, reports, listed, jobs, resources, routing, runtime] =
      await Promise.all([
        handleRequest(
          () =>
            getModel(id, {
              page: evaluationPage.value,
              size: EVALUATION_PAGE_SIZE,
            }),
          { silent: true },
        ),
        handleRequest(
          () => listBacktestReports({ model_version_id: id, size: 50 }),
          { silent: true },
        ),
        handleRequest(
          () => listBacktestPathSets({ model_version_id: id, size: 20 }),
          { silent: true },
        ),
        handleRequest(
          () =>
            listResearchJobs({
              kind: RESEARCH_JOB_KINDS.cpcvBacktest,
              size: 20,
            }),
          { silent: true },
        ),
        handleRequest(() => getConfigResources(), { silent: true }),
        handleRequest(() => getCurrentConfigResource('model_routing'), {
          silent: true,
        }),
        handleRequest(() => getRuntimeControls(), { silent: true }),
      ]);
    if (openId.value === id) {
      model.value = fresh ?? null;
      modelDetail.value = fresh ?? null;
      if (fresh) {
        modelFamily.value = String(fresh.model_family);
      }
      backtests.value = reports?.items ?? [];
      pathSets.value = listed?.items ?? [];
      const preferred =
        selectedPathSetId.value ?? listed?.items?.[0]?.path_set_id ?? null;
      if (preferred) {
        selectedPathSetId.value = preferred;
        pathSet.value =
          pathSets.value.find((row) => row.path_set_id === preferred) ??
          pathSets.value[0] ??
          null;
        if (!pathSet.value) {
          void selectPathSet(preferred);
        }
      } else {
        pathSet.value = null;
      }
      activeCpcvJob.value =
        (jobs?.items ?? []).find(
          (job) =>
            isActiveResearchJobStatus(job.status) &&
            job.params?.model_version_id === id,
        ) ?? null;
      configResources.value = resources ?? null;
      routingResource.value = routing ?? null;
      runtimeControls.value = runtime ?? null;
      if (!resources || !routing || !runtime) {
        bootstrapError.value = $t(
          'page.research.models.bootstrap.stateUnavailable',
        );
      }
    }
  } finally {
    loading.value = false;
  }
}

async function evaluateReadiness() {
  const id = openId.value;
  if (!id || gateLoading.value) {
    return;
  }
  gateLoading.value = true;
  try {
    const readiness = await handleRequest(
      () => getModelQualityGate(id, { intent: 'candidate' }),
      { silent: true },
    );
    if (openId.value === id) {
      gate.value = readiness ?? null;
      if (!readiness && canBootstrapRoute) {
        bootstrapError.value = $t(
          'page.research.models.bootstrap.gateUnavailable',
        );
      }
    }
  } finally {
    if (openId.value === id) {
      gateLoading.value = false;
    }
  }
}

const [Drawer, drawerApi] = useVbenDrawer({
  closeOnPressEscape: true,
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<ModelDrawerData>();
      openId.value = data.model.model_version_id;
      model.value = data.model;
      modelDetail.value = null;
      gate.value = null;
      configResources.value = null;
      routingResource.value = null;
      runtimeControls.value = null;
      bootstrapReceipt.value = null;
      bootstrapError.value = null;
      bootstrapIdempotencyKey.value = crypto.randomUUID();
      evaluationPage.value = 1;
      activeDetailTab.value = 'input-contract';
      selectedPathSetId.value =
        typeof route.query.path_set_id === 'string'
          ? route.query.path_set_id
          : null;
      void refresh(data.model.model_version_id);
    } else {
      openId.value = null;
      model.value = null;
      modelDetail.value = null;
      backtests.value = [];
      pathSets.value = [];
      pathSet.value = null;
      selectedPathSetId.value = null;
      activeCpcvJob.value = null;
      gate.value = null;
      configResources.value = null;
      routingResource.value = null;
      runtimeControls.value = null;
      bootstrapReceipt.value = null;
      bootstrapError.value = null;
      evaluationPage.value = 1;
    }
  },
});

function onEvaluationPageChange() {
  if (openId.value) {
    void refresh(openId.value);
  }
}

// Refresh path set / backtests / gate when a research job completes (WS bump).
watch(
  () => researchStore.revision,
  () => {
    if (openId.value) {
      void refresh(openId.value);
    }
  },
);
</script>

<template>
  <Drawer
    :title="$t('page.research.models.detail.title')"
    class="w-full max-w-3xl"
  >
    <p aria-atomic="true" aria-live="polite" class="sr-only" role="status">
      {{ detailAnnouncement }}
    </p>
    <Spin :spinning="loading">
      <div v-if="model" class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <Space v-if="canReplay">
            <Button
              v-if="showSinglePathBacktest"
              size="small"
              @click="openBacktest"
            >
              {{ $t('page.research.models.actions.backtest') }}
            </Button>
            <Button size="small" type="primary" @click="openCpcv">
              {{ $t('page.research.models.actions.cpcv') }}
            </Button>
          </Space>
        </div>

        <Alert :message="dualTrackHint" show-icon type="info" />

        <Card
          size="small"
          :title="$t('page.research.models.detail.candidateReadiness')"
        >
          <template #extra>
            <Button
              :loading="gateLoading"
              size="small"
              @click="evaluateReadiness"
            >
              {{
                $t(
                  gate
                    ? 'page.research.qualityGate.reevaluate'
                    : 'page.research.qualityGate.evaluate',
                )
              }}
            </Button>
          </template>
          <QualityGateScorecard :loading="gateLoading" :report="gate" />
          <Space v-if="needsCpcvRunCta" class="mt-3">
            <Button v-if="needsCpcvRunCta" type="primary" @click="openCpcv">
              {{ $t('page.research.models.cpcv.action') }}
            </Button>
          </Space>
        </Card>

        <Card
          v-if="canBootstrapRoute || bootstrapReceipt"
          size="small"
          :title="$t('page.research.models.bootstrap.title')"
        >
          <div class="flex flex-col gap-3">
            <Alert
              v-if="bootstrapError"
              :message="bootstrapError"
              show-icon
              type="error"
            >
              <template #action>
                <Button
                  size="small"
                  @click="model && refresh(model.model_version_id)"
                >
                  {{ $t('page.research.models.bootstrap.retry') }}
                </Button>
              </template>
            </Alert>
            <Alert
              v-else-if="bootstrapStateUnavailable"
              :message="$t('page.research.models.bootstrap.stateUnavailable')"
              show-icon
              type="warning"
            />
            <Alert v-else-if="routedModelId" show-icon type="info">
              <template #message>
                <span class="block w-full" data-screenshot-volatile="true">
                  {{
                    $t('page.research.models.bootstrap.routeOccupied', {
                      model: routedModelId,
                    })
                  }}
                </span>
              </template>
            </Alert>
            <Alert
              :message="$t('page.research.models.bootstrap.authorityUnchanged')"
              show-icon
              type="info"
            />
            <Descriptions :column="1" bordered size="small">
              <DescriptionsItem
                :label="$t('page.research.models.bootstrap.route')"
              >
                {{ bootstrapRouteLabel }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.models.bootstrap.model')"
              >
                <span
                  class="block w-full break-all font-mono text-xs"
                  data-testid="model-bootstrap-candidate"
                >
                  {{ model.model_version_id }}
                </span>
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.models.bootstrap.generation')"
              >
                {{
                  configResources
                    ? `${configResources.active_bundle_generation} → ${
                        configResources.active_bundle_generation + 1
                      }`
                    : '—'
                }}
              </DescriptionsItem>
            </Descriptions>
            <Button
              :disabled="!bootstrapPrerequisitesReady"
              :loading="bootstrapLoading"
              type="primary"
              @click="bootstrapFirstChampion"
            >
              {{ $t('page.research.models.bootstrap.action') }}
            </Button>
            <Alert
              v-if="!bootstrapPrerequisitesReady && !routedModelId"
              :message="$t('page.research.models.bootstrap.prerequisitesHint')"
              show-icon
              type="warning"
            />
            <Descriptions
              v-if="bootstrapReceipt"
              :column="1"
              bordered
              size="small"
            >
              <DescriptionsItem
                :label="$t('page.research.models.bootstrap.transaction')"
              >
                <CopyableHash
                  :label="$t('page.research.models.bootstrap.transaction')"
                  :value="bootstrapReceipt.transaction_hash"
                />
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.models.bootstrap.actor')"
              >
                {{ bootstrapReceipt.activated_by_username }} ·
                {{ bootstrapReceipt.activated_by_role }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.models.bootstrap.receipt')"
              >
                <span class="break-all font-mono text-xs">
                  {{ bootstrapReceipt.policy_activation_id }} ·
                  {{ bootstrapReceipt.model_governance_audit_id }}
                </span>
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.models.bootstrap.rollback')"
              >
                <Button
                  size="small"
                  type="link"
                  @click="router.push('/system/config/model_routing')"
                >
                  {{ $t('page.research.models.bootstrap.openRouting') }}
                </Button>
              </DescriptionsItem>
            </Descriptions>
          </div>
        </Card>

        <Card size="small">
          <label class="sr-only" for="model-detail-section">
            {{ $t('page.research.models.detail.sectionSelector') }}
          </label>
          <Select
            id="model-detail-section"
            v-model:value="activeDetailTab"
            :aria-label="$t('page.research.models.detail.sectionSelector')"
            class="mb-3 min-h-11 w-full sm:hidden"
            :options="detailTabOptions"
          />
          <Tabs
            v-model:active-key="activeDetailTab"
            class="model-detail-tabs"
            destroy-on-hidden
          >
            <TabPane
              key="input-contract"
              :tab="$t('page.research.models.detail.artifactLineage')"
            >
              <div v-if="artifactLineage" class="flex flex-col gap-3">
                <Descriptions :column="2" bordered size="small">
                  <DescriptionsItem
                    :label="$t('page.research.models.detail.lineageKind')"
                  >
                    {{ artifactLineage.kind }}
                  </DescriptionsItem>
                  <DescriptionsItem
                    v-if="serializationFormat"
                    :label="
                      $t('page.research.models.detail.serializationFormat')
                    "
                  >
                    {{ serializationFormat }}
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="
                      $t('page.research.models.detail.trainingDatasetHash')
                    "
                    :span="2"
                  >
                    <span class="font-mono text-xs break-all">
                      {{ artifactLineage.training_dataset_hash }}
                    </span>
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="$t('page.research.models.detail.trainingInputHash')"
                    :span="2"
                  >
                    <span class="font-mono text-xs break-all">
                      {{ artifactLineage.training_input_hash }}
                    </span>
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="$t('page.research.models.detail.inputContractHash')"
                    :span="2"
                  >
                    <span class="font-mono text-xs break-all">
                      {{ artifactLineage.input_contract_hash }}
                    </span>
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="
                      $t('page.research.models.detail.inputTransformHash')
                    "
                    :span="2"
                  >
                    <span class="font-mono text-xs break-all">
                      {{ artifactLineage.input_transform_hash }}
                    </span>
                  </DescriptionsItem>
                  <DescriptionsItem
                    v-if="serializedModelHash"
                    :label="
                      $t('page.research.models.detail.serializedModelHash')
                    "
                    :span="2"
                  >
                    <span class="font-mono text-xs break-all">
                      {{ field(serializedModelHash) }}
                    </span>
                  </DescriptionsItem>
                </Descriptions>

                <div v-if="factorInputs.length > 0" class="flex flex-col gap-1">
                  <span class="text-sm font-medium">
                    {{ $t('page.research.models.detail.factorInputs') }}
                  </span>
                  <Space wrap>
                    <Tag v-for="input in factorInputs" :key="input">
                      {{ input }}
                    </Tag>
                  </Space>
                </div>
              </div>
              <Empty
                v-else
                :description="
                  $t('page.research.models.detail.artifactLineageUnavailable')
                "
                :image="Empty.PRESENTED_IMAGE_SIMPLE"
              />
            </TabPane>
            <TabPane
              key="serving-contract"
              :tab="$t('page.research.models.detail.servingContract')"
            >
              <div
                v-if="modelDetail && servingLineage && servingCommitments"
                class="flex flex-col gap-4"
              >
                <Descriptions
                  :column="{ lg: 2, md: 2, sm: 1, xl: 2, xs: 1, xxl: 2 }"
                  bordered
                  size="small"
                >
                  <DescriptionsItem
                    :label="$t('page.research.models.detail.contractVersion')"
                  >
                    {{ servingLineage.contractVersion }}
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="$t('page.research.models.detail.derivation')"
                  >
                    {{ modelDetail.derivation.kind }}
                    <template
                      v-if="
                        modelDetail.derivation.kind === 'return_calibration'
                      "
                    >
                      ·
                      <EntityRouteLink
                        mono
                        :label="modelDetail.derivation.parent_model_version_id"
                        :to="`/research/models?open=${modelDetail.derivation.parent_model_version_id}`"
                      />
                      ·
                      <EntityRouteLink
                        mono
                        :label="modelDetail.derivation.calibration_artifact_id"
                        :to="`/research/calibration-artifacts?open=${modelDetail.derivation.calibration_artifact_id}`"
                      />
                    </template>
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="$t('page.research.models.detail.contractHash')"
                    :span="2"
                  >
                    <CopyableHash
                      :label="$t('page.research.models.detail.contractHash')"
                      :value="servingLineage.contractHash"
                    />
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="$t('page.research.models.detail.embeddedHash')"
                    :span="2"
                  >
                    <CopyableHash
                      :label="$t('page.research.models.detail.embeddedHash')"
                      :value="modelDetail.serving_contract.contract_hash"
                    />
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="$t('page.research.models.detail.factorSchemaHash')"
                    :span="2"
                  >
                    <CopyableHash
                      :label="
                        $t('page.research.models.detail.factorSchemaHash')
                      "
                      :value="servingLineage.factorSchemaHash"
                    />
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="$t('page.research.models.detail.requiredDomains')"
                  >
                    <div class="flex flex-wrap gap-1">
                      <Tag
                        v-for="family in servingLineage.requiredDomainFamilies"
                        :key="family"
                      >
                        {{ $t(`enum.domainFamily.${family}`) }}
                      </Tag>
                      <span
                        v-if="
                          servingLineage.requiredDomainFamilies.length === 0
                        "
                      >
                        —
                      </span>
                    </div>
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="$t('page.research.models.detail.capabilityHashes')"
                  >
                    {{ servingLineage.capabilityRegistryHashes.length }}
                  </DescriptionsItem>
                </Descriptions>

                <section
                  v-if="servingLineage.capabilityRegistryHashes.length > 0"
                  class="space-y-2"
                >
                  <h4 class="text-sm font-medium">
                    {{ $t('page.research.models.detail.capabilityHashes') }}
                  </h4>
                  <CopyableHash
                    v-for="hash in servingLineage.capabilityRegistryHashes"
                    :key="hash"
                    :label="$t('page.research.models.detail.capabilityHash')"
                    :value="hash"
                  />
                </section>

                <section class="space-y-2">
                  <h4 class="text-sm font-medium">
                    {{ $t('page.research.models.detail.factorRevisions') }}
                  </h4>
                  <Empty
                    v-if="servingLineage.factorDefinitions.length === 0"
                    :description="
                      $t('page.research.models.detail.factorRevisionsEmpty')
                    "
                    :image="Empty.PRESENTED_IMAGE_SIMPLE"
                  />
                  <Descriptions
                    v-for="factor in servingLineage.factorDefinitions"
                    v-else
                    :key="factor.factor_definition_id"
                    :column="1"
                    bordered
                    size="small"
                  >
                    <DescriptionsItem
                      :label="$t('page.research.models.detail.factorId')"
                    >
                      <EntityRouteLink
                        mono
                        :label="factor.factor_definition_id"
                        :to="`/research/factors?open=${factor.factor_definition_id}`"
                      />
                    </DescriptionsItem>
                    <DescriptionsItem
                      :label="
                        $t('page.research.models.detail.factorDefinitionHash')
                      "
                    >
                      <CopyableHash
                        :label="
                          $t('page.research.models.detail.factorDefinitionHash')
                        "
                        :value="factor.definition_hash"
                      />
                    </DescriptionsItem>
                    <DescriptionsItem
                      :label="
                        $t('page.research.models.detail.featureContractHash')
                      "
                    >
                      <CopyableHash
                        :label="
                          $t('page.research.models.detail.featureContractHash')
                        "
                        :value="factor.feature_contract_hash"
                      />
                    </DescriptionsItem>
                    <DescriptionsItem
                      :label="$t('page.research.models.detail.factorRevision')"
                    >
                      {{ factor.revision_version }} ·
                      {{ factor.input_schema_version }} →
                      {{ factor.output_schema_version }}
                    </DescriptionsItem>
                  </Descriptions>
                </section>

                <Descriptions :column="1" bordered size="small">
                  <DescriptionsItem
                    :label="$t('page.research.models.detail.featureSchemaHash')"
                  >
                    <CopyableHash
                      :label="
                        $t('page.research.models.detail.featureSchemaHash')
                      "
                      :value="servingCommitments.featureSchemaHash"
                    />
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="$t('page.research.models.detail.labelSchemaHash')"
                  >
                    <CopyableHash
                      :label="$t('page.research.models.detail.labelSchemaHash')"
                      :value="servingCommitments.labelSchemaHash"
                    />
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="$t('page.research.models.detail.inputContractHash')"
                  >
                    <CopyableHash
                      :label="
                        $t('page.research.models.detail.inputContractHash')
                      "
                      :value="servingCommitments.inputContractHash"
                    />
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="
                      $t('page.research.models.detail.inputTransformHash')
                    "
                  >
                    <CopyableHash
                      :label="
                        $t('page.research.models.detail.inputTransformHash')
                      "
                      :value="servingCommitments.inputTransformHash"
                    />
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="
                      $t('page.research.models.detail.trainingDatasetHash')
                    "
                  >
                    <CopyableHash
                      :label="
                        $t('page.research.models.detail.trainingDatasetHash')
                      "
                      :value="servingCommitments.trainingDatasetHash"
                    />
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="$t('page.research.models.detail.trainingInputHash')"
                  >
                    <CopyableHash
                      :label="
                        $t('page.research.models.detail.trainingInputHash')
                      "
                      :value="servingCommitments.trainingInputHash"
                    />
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="
                      $t('page.research.models.detail.policySnapshotHash')
                    "
                  >
                    <CopyableHash
                      :label="
                        $t('page.research.models.detail.policySnapshotHash')
                      "
                      :value="servingCommitments.policySnapshotHash"
                    />
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="
                      $t('page.research.models.detail.datasetManifestHash')
                    "
                  >
                    <CopyableHash
                      :label="
                        $t('page.research.models.detail.datasetManifestHash')
                      "
                      :value="servingCommitments.datasetManifestHash"
                    />
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="$t('page.research.models.detail.datasetBytesHash')"
                  >
                    <CopyableHash
                      :label="
                        $t('page.research.models.detail.datasetBytesHash')
                      "
                      :value="servingCommitments.datasetBytesHash"
                    />
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="
                      $t('page.research.models.detail.specDefinitionHash')
                    "
                  >
                    <CopyableHash
                      :label="
                        $t('page.research.models.detail.specDefinitionHash')
                      "
                      :value="servingCommitments.modelSpecDefinitionHash"
                    />
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="
                      $t('page.research.models.detail.profileContentHash')
                    "
                  >
                    <CopyableHash
                      :label="
                        $t('page.research.models.detail.profileContentHash')
                      "
                      :value="servingCommitments.profileContentHash"
                    />
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="$t('page.research.models.detail.modelPayloadHash')"
                  >
                    <CopyableHash
                      :label="
                        $t('page.research.models.detail.modelPayloadHash')
                      "
                      :value="servingCommitments.modelPayloadHash"
                    />
                  </DescriptionsItem>
                  <DescriptionsItem
                    v-if="servingCommitments.serializedModelHash"
                    :label="
                      $t('page.research.models.detail.serializedModelHash')
                    "
                  >
                    <CopyableHash
                      :label="
                        $t('page.research.models.detail.serializedModelHash')
                      "
                      :value="servingCommitments.serializedModelHash"
                    />
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="
                      $t('page.research.models.detail.modelCalibrationHash')
                    "
                  >
                    <CopyableHash
                      v-if="servingCommitments.modelCalibrationHash"
                      :label="
                        $t('page.research.models.detail.modelCalibrationHash')
                      "
                      :value="servingCommitments.modelCalibrationHash"
                    />
                    <span v-else>—</span>
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="$t('page.research.models.detail.biasTableHash')"
                  >
                    <CopyableHash
                      v-if="servingCommitments.biasTableHash"
                      :label="$t('page.research.models.detail.biasTableHash')"
                      :value="servingCommitments.biasTableHash"
                    />
                    <span v-else>—</span>
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="$t('page.research.models.detail.tradePolicyHash')"
                  >
                    <CopyableHash
                      v-if="servingCommitments.tradePolicyHash"
                      :label="$t('page.research.models.detail.tradePolicyHash')"
                      :value="servingCommitments.tradePolicyHash"
                    />
                    <span v-else>—</span>
                  </DescriptionsItem>
                </Descriptions>

                <section class="space-y-2">
                  <h4 class="text-sm font-medium">
                    {{ $t('page.research.models.detail.profileArtifacts') }}
                  </h4>
                  <Descriptions
                    v-for="artifact in servingCommitments.profileArtifacts"
                    :key="artifact.kind"
                    :column="1"
                    bordered
                    size="small"
                  >
                    <DescriptionsItem
                      :label="
                        $t('page.research.models.detail.profileArtifactHash', {
                          kind: artifact.kind,
                        })
                      "
                    >
                      <CopyableHash
                        :label="
                          $t(
                            'page.research.models.detail.profileArtifactHash',
                            { kind: artifact.kind },
                          )
                        "
                        :value="artifact.content_hash"
                      />
                    </DescriptionsItem>
                  </Descriptions>
                </section>

                <section class="space-y-2">
                  <h4 class="text-sm font-medium">
                    {{
                      $t('page.research.models.detail.evaluationLineage', {
                        count: modelDetail.evaluation_lineage.total,
                      })
                    }}
                  </h4>
                  <Empty
                    v-if="modelDetail.evaluation_lineage.items.length === 0"
                    :description="
                      $t('page.research.models.detail.evaluationLineageEmpty')
                    "
                    :image="Empty.PRESENTED_IMAGE_SIMPLE"
                  />
                  <Descriptions
                    v-for="usage in modelDetail.evaluation_lineage.items"
                    v-else
                    :key="usage.feedback_evaluation_use_id"
                    :column="1"
                    bordered
                    size="small"
                  >
                    <DescriptionsItem
                      :label="$t('page.research.models.detail.feedbackCycle')"
                    >
                      <EntityRouteLink
                        mono
                        :label="usage.feedback_cycle_id"
                        :to="`/research/feedback?view=cycles&cycle_id=${usage.feedback_cycle_id}`"
                      />
                    </DescriptionsItem>
                    <DescriptionsItem
                      :label="$t('page.research.models.detail.evaluationHash')"
                    >
                      <CopyableHash
                        :label="
                          $t('page.research.models.detail.evaluationHash')
                        "
                        :value="usage.evaluation_use_hash"
                      />
                    </DescriptionsItem>
                  </Descriptions>
                  <Pagination
                    v-if="
                      modelDetail.evaluation_lineage.total >
                      modelDetail.evaluation_lineage.size
                    "
                    v-model:current="evaluationPage"
                    :page-size="modelDetail.evaluation_lineage.size"
                    :show-size-changer="false"
                    :total="modelDetail.evaluation_lineage.total"
                    @change="onEvaluationPageChange"
                  />
                </section>

                <section class="space-y-2">
                  <h4 class="text-sm font-medium">
                    {{
                      $t('page.research.models.detail.promotionLineage', {
                        count: modelDetail.promotion_lineage.length,
                      })
                    }}
                  </h4>
                  <Empty
                    v-if="modelDetail.promotion_lineage.length === 0"
                    :description="
                      $t('page.research.models.detail.promotionLineageEmpty')
                    "
                    :image="Empty.PRESENTED_IMAGE_SIMPLE"
                  />
                  <Descriptions
                    v-for="promotion in modelDetail.promotion_lineage"
                    v-else
                    :key="promotion.audit_id"
                    :column="1"
                    bordered
                    size="small"
                  >
                    <DescriptionsItem
                      :label="$t('page.research.models.detail.promotionRole')"
                    >
                      {{ promotion.role }}
                    </DescriptionsItem>
                    <DescriptionsItem
                      :label="$t('page.research.models.detail.permitId')"
                    >
                      <span class="break-all font-mono text-xs">
                        {{ promotion.promotion_permit_id }}
                      </span>
                    </DescriptionsItem>
                    <DescriptionsItem
                      :label="$t('page.research.models.detail.promotionHash')"
                    >
                      <CopyableHash
                        :label="$t('page.research.models.detail.promotionHash')"
                        :value="promotion.promotion_transaction_hash"
                      />
                    </DescriptionsItem>
                    <DescriptionsItem
                      :label="$t('page.research.models.detail.actorReason')"
                    >
                      {{ promotion.actor_username }} ·
                      {{ promotion.actor_role ?? '—' }} ·
                      {{ promotion.reason }}
                    </DescriptionsItem>
                  </Descriptions>
                </section>
              </div>
              <Empty
                v-else
                :description="
                  $t('page.research.models.detail.servingContractUnavailable')
                "
                :image="Empty.PRESENTED_IMAGE_SIMPLE"
              />
            </TabPane>
            <TabPane
              key="parity"
              :tab="$t('page.research.models.detail.parity')"
            >
              <FeatureParityStatusPanel
                :model-version-id="model.model_version_id"
              />
            </TabPane>
            <TabPane
              key="trade-policy"
              data-testid="model-trade-policy-tab"
              :tab="$t('page.research.models.detail.tradePolicy')"
            >
              <Descriptions
                v-if="model.trade_policy_artifact_id"
                data-testid="model-trade-policy-binding"
                :column="1"
                bordered
                size="small"
              >
                <DescriptionsItem
                  :label="$t('page.research.models.detail.tradePolicyId')"
                >
                  <span data-screenshot-volatile="true">
                    <EntityRouteLink
                      mono
                      :label="model.trade_policy_artifact_id"
                      :to="`/research/trade-policies/${model.trade_policy_artifact_id}`"
                    />
                  </span>
                </DescriptionsItem>
                <DescriptionsItem
                  :label="$t('page.research.models.detail.tradePolicyHash')"
                >
                  <span
                    class="font-mono text-xs break-all"
                    data-screenshot-volatile="true"
                  >
                    {{ field(model.trade_policy_hash) }}
                  </span>
                </DescriptionsItem>
              </Descriptions>
              <Empty
                v-else
                :description="
                  $t('page.research.models.detail.tradePolicyUnavailable')
                "
                :image="Empty.PRESENTED_IMAGE_SIMPLE"
              />
            </TabPane>
          </Tabs>
        </Card>

        <Card
          size="small"
          :title="$t('page.research.models.detail.returnModel')"
        >
          <Alert
            v-if="!isCalibratedReturnModel"
            class="mb-3"
            :message="
              $t('page.research.models.detail.returnModelHeuristicWarning')
            "
            show-icon
            type="error"
          />
          <Descriptions v-if="returnModel" :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.research.models.detail.returnModelKind')"
            >
              {{
                returnModel.calibration === 'calibrated'
                  ? $t('page.research.models.detail.returnModelCalibrated')
                  : $t('page.research.models.detail.returnModelHeuristic')
              }}
            </DescriptionsItem>
            <DescriptionsItem
              v-if="returnModel.calibration === 'calibrated'"
              :label="$t('page.research.models.detail.calibratorRef')"
            >
              <EntityRouteLink
                mono
                :label="returnModel.calibrator_ref"
                :to="`/research/calibration-artifacts?open=${returnModel.calibrator_ref}`"
              />
            </DescriptionsItem>
            <DescriptionsItem
              v-if="returnModel.calibration === 'calibrated'"
              :label="$t('page.research.models.detail.downsideSource')"
            >
              {{ $t(`enum.downsideSource.${returnModel.downside_source}`) }}
            </DescriptionsItem>
          </Descriptions>
          <Empty
            v-else
            :description="$t('page.research.models.detail.returnModelUnknown')"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </Card>

        <Card
          size="small"
          :title="$t('page.research.models.detail.trainingObjective')"
        >
          <Empty
            v-if="!trainingObjective"
            :description="$t('page.research.models.detail.objectiveUnknown')"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
          <template v-else>
            <Descriptions :column="2" bordered size="small">
              <DescriptionsItem
                :label="$t('page.research.models.detail.objectiveKind')"
              >
                {{ field(trainingObjectiveDefinition?.kind) }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.models.detail.formatVersion')"
              >
                {{ trainingObjective.format_version }}
              </DescriptionsItem>
              <DescriptionsItem
                v-if="learningToRankObjective"
                :label="$t('page.research.models.detail.rankLoss')"
              >
                {{ field(learningToRankObjective.rank_loss) }}
              </DescriptionsItem>
              <DescriptionsItem
                v-if="learningToRankObjective"
                :label="$t('page.research.models.detail.optimizer')"
              >
                {{ field(learningToRankObjective.optimizer) }}
              </DescriptionsItem>
              <DescriptionsItem
                v-if="learningToRankObjective"
                :label="$t('page.research.models.detail.lambdaTail')"
              >
                {{ field(learningToRankObjective.lambda_tail) }}
              </DescriptionsItem>
              <DescriptionsItem
                v-if="learningToRankObjective"
                :label="$t('page.research.models.detail.tailFraction')"
              >
                {{ field(learningToRankObjective.tail_fraction) }}
              </DescriptionsItem>
              <DescriptionsItem
                v-if="learningToRankObjective"
                :label="$t('page.research.models.detail.lambdaTurnover')"
              >
                {{ field(learningToRankObjective.lambda_turnover) }}
              </DescriptionsItem>
              <DescriptionsItem
                v-if="learningToRankObjective"
                :label="$t('page.research.models.detail.lambdaL2')"
              >
                {{ field(learningToRankObjective.lambda_l2) }}
              </DescriptionsItem>
              <DescriptionsItem
                v-if="learningToRankObjective"
                :label="$t('page.research.models.detail.ndcgK')"
              >
                {{ learningToRankObjective.ndcg_k }}
              </DescriptionsItem>
              <DescriptionsItem
                v-if="learningToRankObjective"
                :label="$t('page.research.models.detail.pseudoTopN')"
              >
                {{ learningToRankObjective.pseudo_top_n }}
              </DescriptionsItem>
              <DescriptionsItem
                v-if="
                  trainingObjectiveDefinition?.kind === 'classical_pointwise'
                "
                :label="$t('page.research.models.detail.modelKind')"
              >
                {{ trainingObjectiveDefinition.model_kind }}
              </DescriptionsItem>
              <DescriptionsItem
                v-if="
                  trainingObjectiveDefinition?.kind === 'classical_pointwise'
                "
                :label="$t('page.research.models.detail.validationMetric')"
              >
                {{ trainingObjectiveDefinition.validation_metric }}
              </DescriptionsItem>
              <DescriptionsItem
                v-if="trainingObjectiveDefinition?.kind === 'hand_authored'"
                :label="$t('page.research.models.detail.rationale')"
                :span="2"
              >
                {{ trainingObjectiveDefinition.rationale }}
              </DescriptionsItem>
            </Descriptions>
            <p
              v-if="learningToRankObjective"
              class="text-muted-foreground mt-2 text-xs"
            >
              {{ $t('page.research.models.detail.objectiveProxyHint') }}
            </p>
          </template>
        </Card>

        <Card size="small" :title="$t('page.research.models.detail.summary')">
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.research.models.columns.modelVersionId')"
            >
              <span class="font-mono text-xs break-all">
                {{ model.model_version_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.models.columns.modelSpec')"
            >
              <EntityRouteLink
                :label="model.model_spec_name"
                :to="`/research/model-specs?open=${model.model_spec_id}`"
              />
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.models.detail.specDefinitionHash')"
            >
              <span class="font-mono text-xs break-all">
                {{ model.model_spec_definition_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.models.columns.version')"
            >
              {{ model.version }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.models.columns.artifactHash')"
            >
              <span class="font-mono text-xs break-all">
                {{ model.artifact_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              v-if="model.training_dataset_id"
              :label="$t('page.research.models.columns.dataset')"
            >
              <EntityRouteLink
                mono
                :label="model.training_dataset_id"
                :to="`/research/datasets?open=${model.training_dataset_id}`"
              />
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.models.columns.createdAt')"
            >
              {{ formatDateTimeLocal(model.created_at) }}
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card
          size="small"
          :title="$t('page.research.models.detail.researchThesis')"
        >
          <Descriptions :column="1" size="small">
            <DescriptionsItem
              :label="$t('page.research.models.detail.thesisSummary')"
            >
              {{ model.model_spec_thesis.summary }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.models.detail.thesisHypothesis')"
            >
              {{ model.model_spec_thesis.hypothesis }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.models.detail.thesisLimitations')"
            >
              <ul class="list-disc space-y-1 pl-5">
                <li
                  v-for="item in model.model_spec_thesis.limitations"
                  :key="item"
                >
                  {{ item }}
                </li>
              </ul>
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card size="small" :title="$t('page.research.models.detail.metrics')">
          <ModelMetricsPanel :metrics="metrics" />
        </Card>

        <Card size="small" :title="$t('page.research.models.detail.backtests')">
          <div v-if="backtests.length > 0" class="flex flex-col gap-2">
            <div
              v-for="report in backtests"
              :key="report.backtest_report_id"
              class="flex items-center justify-between gap-2 text-sm"
            >
              <EntityRouteLink
                mono
                :label="report.backtest_report_id"
                :to="`/research/backtests?open=${report.backtest_report_id}`"
              />
              <span class="text-muted-foreground text-xs">
                {{ formatDateTimeLocal(report.created_at) }}
              </span>
            </div>
          </div>
          <Empty
            v-else
            :description="$t('page.research.models.detail.noBacktests')"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </Card>

        <Card size="small" :title="$t('page.research.cpcv.title')">
          <CpcvValidationPanel
            :active-job-id="activeCpcvJob?.job_id ?? null"
            :gate-outcomes="cpcvGateOutcomes"
            :in-progress="cpcvInProgress"
            :path-set="pathSet"
            :path-sets="pathSets"
            :progress-phase="activeCpcvJob?.progress?.phase ?? null"
            :progress-pct="activeCpcvJob?.progress_pct ?? null"
            :selected-path-set-id="selectedPathSetId"
            @update:selected-path-set-id="selectPathSet"
          />
        </Card>
      </div>
    </Spin>
    <BacktestModal />
    <CpcvModal />
  </Drawer>
</template>

<style scoped>
@media (max-width: 639px) {
  .model-detail-tabs :deep(.ant-tabs-nav) {
    display: none;
  }
}
</style>
