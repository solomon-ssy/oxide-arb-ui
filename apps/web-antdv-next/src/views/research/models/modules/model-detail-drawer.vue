<script lang="ts" setup>
import type {
  BacktestPathSetView,
  BacktestReportView,
  QualityGateReportView,
  ResearchJobView,
  ReturnModelView,
  TrainedModelView,
} from '@vben/types';

import type { BacktestBody } from './model-backtest-modal.vue';
import type { BindCalibrationBody } from './model-bind-calibration-modal.vue';
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
  Space,
  Spin,
  TabPane,
  Tabs,
  Tag,
} from 'antdv-next';

import { bindCalibration } from '#/api/calibration';
import {
  backtestModel,
  bindPublishPathSet,
  cpcvBacktestModel,
  getBacktestPathSet,
  getModel,
  getModelQualityGate,
  listBacktestPathSets,
  listBacktestReports,
  listResearchJobs,
} from '#/api/research';
import { $t } from '#/locales';
import DataList from '#/shared/components/data-list.vue';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import FeatureParityStatusPanel from '#/shared/components/feature-parity-status-panel.vue';
import {
  EMPTY_PLACEHOLDER,
  formatDateTimeLocal,
} from '#/shared/components/format';
import {
  findTagOption,
  usePublicationStatusTagOptions,
} from '#/shared/components/format/tag-options';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useResearchStore } from '#/store';

import CpcvValidationPanel from '../../shared/cpcv-validation-panel.vue';
import QualityGateScorecard from '../../shared/quality-gate-scorecard.vue';
import ModelBacktestModal from './model-backtest-modal.vue';
import ModelBindCalibrationModal from './model-bind-calibration-modal.vue';
import ModelCpcvModal from './model-cpcv-modal.vue';
import { formatModelInputStateRates } from './model-input-diagnostics';
import ModelMetricsPanel from './model-metrics-panel.vue';

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
const statusTagOptions = usePublicationStatusTagOptions();

const canBindCalibration = hasAccessByCodes(['publication:create']);
const canBindPathSet = hasAccessByCodes(['publication:create']);
const canReplay = hasAccessByCodes(['replay:create']);

/** Sell family has lot-level CPCV only — no Buy-style single-path backtest. */
const SELL_MODEL_FAMILY = 'hold_vs_exit_weighted';

const model = ref<null | TrainedModelView>(null);
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
const loading = ref(false);
const gateLoading = ref(false);
const bindPathSetLoading = ref(false);
const openId = ref<null | string>(null);

const metrics = computed(() => model.value?.metrics ?? {});
const statusTag = computed(() =>
  findTagOption(statusTagOptions, model.value?.publication_status),
);

const cpcvInProgress = computed(() => !!activeCpcvJob.value);

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
  // Bound path set exists but alpha metrics fail → re-run CPCV (or re-bind another).
  const alphaFail = hardFails.some(
    (out) =>
      out.gate === 'pbo' ||
      out.gate === 'deflated_sharpe' ||
      out.gate === 'rank_ic' ||
      out.gate === 'max_drawdown' ||
      out.gate === 'tail_loss_budget' ||
      out.gate === 'sell_baseline_uplift',
  );
  return alphaFail && !!model.value?.publish_path_set_id;
});

/** Path sets exist but none is publish-bound → bind CTA, not re-run. */
const needsBindCta = computed(() => {
  const report = gate.value;
  if (!report || report.passed || !canBindPathSet) {
    return false;
  }
  const missingPathSet = report.gates.some(
    (out) =>
      out.class === 'hard' &&
      out.status === 'fail' &&
      out.gate === 'cpcv_required',
  );
  return (
    missingPathSet &&
    pathSets.value.length > 0 &&
    !model.value?.publish_path_set_id
  );
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

const publishBoundPathSetId = computed(
  () => model.value?.publish_path_set_id ?? null,
);

const returnModel = computed<null | ReturnModelView>(
  () => model.value?.return_model ?? null,
);

function asRecord(value: unknown): null | Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function recordArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }
  const records: Array<Record<string, unknown>> = [];
  for (const item of value) {
    const record = asRecord(item);
    if (record) {
      records.push(record);
    }
  }
  return records;
}

function field(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  return String(value);
}

const trainingObjective = computed(() =>
  asRecord(model.value?.training_objective),
);

const modelMetricsRecord = computed(() => asRecord(model.value?.metrics));
const artifactDiagnostics = computed(() =>
  asRecord(modelMetricsRecord.value?.artifact_diagnostics),
);
const inputTransform = computed(() =>
  asRecord(artifactDiagnostics.value?.input_transform),
);
const transformInputs = computed(() => {
  return recordArray(inputTransform.value?.inputs);
});
const encodedColumns = computed(() => {
  return recordArray(inputTransform.value?.encoded_columns);
});
const artifactFormatVersion = computed(
  () => artifactDiagnostics.value?.format_version,
);
const serializedModelHash = computed(
  () => artifactDiagnostics.value?.serialized_model_hash,
);
const factorInputs = computed(() => {
  const inputs = artifactDiagnostics.value?.factor_inputs;
  return Array.isArray(inputs) ? inputs.map(String) : [];
});
const rawContractInputs = computed(() => {
  const direct = artifactDiagnostics.value?.raw_inputs;
  const contract = asRecord(artifactDiagnostics.value?.input_contract);
  const inputs = Array.isArray(direct) ? direct : contract?.inputs;
  return Array.isArray(inputs) ? inputs : [];
});

const rawInputColumns = [
  {
    dataIndex: 'feature',
    key: 'feature',
    title: $t('page.research.models.detail.inputFeature'),
  },
  {
    dataIndex: 'required',
    key: 'required',
    title: $t('page.research.models.detail.requiredness'),
  },
  {
    dataIndex: 'unit',
    key: 'unit',
    title: $t('page.research.models.detail.inputUnit'),
  },
  {
    dataIndex: 'valueKind',
    key: 'valueKind',
    title: $t('page.research.models.detail.valueKind'),
  },
  {
    dataIndex: 'median',
    key: 'median',
    title: $t('page.research.models.detail.median'),
  },
  {
    dataIndex: 'mean',
    key: 'mean',
    title: $t('page.research.models.detail.mean'),
  },
  {
    dataIndex: 'std',
    key: 'std',
    title: $t('page.research.models.detail.std'),
  },
  {
    dataIndex: 'stateRates',
    key: 'stateRates',
    title: $t('page.research.models.detail.stateRates'),
  },
  {
    dataIndex: 'vocabulary',
    key: 'vocabulary',
    title: $t('page.research.models.detail.vocabulary'),
  },
];
const encodedColumnColumns = [
  {
    dataIndex: 'name',
    key: 'name',
    title: $t('page.research.models.detail.encodedName'),
  },
  {
    dataIndex: 'source',
    key: 'source',
    title: $t('page.research.models.detail.encodedSource'),
  },
  {
    dataIndex: 'kind',
    key: 'kind',
    title: $t('page.research.models.detail.encodedKind'),
  },
];

const rawInputRows = computed(() => {
  if (transformInputs.value.length > 0) {
    return transformInputs.value.map((input) => {
      return {
        feature: field(input.feature),
        key: field(input.feature),
        mean: field(input.mean),
        median: field(input.median),
        required: input.required === true,
        stateRates: formatModelInputStateRates(
          input.state_rates,
          EMPTY_PLACEHOLDER,
        ),
        std: field(input.std),
        unit: field(input.unit),
        valueKind: field(input.value_kind),
        vocabulary: Array.isArray(input.category_vocabulary)
          ? input.category_vocabulary.map(String).join(', ') ||
            EMPTY_PLACEHOLDER
          : EMPTY_PLACEHOLDER,
      };
    });
  }
  return rawContractInputs.value.map((input, index) => {
    const record = asRecord(input);
    const feature = record ? field(record.feature_name) : String(input);
    return {
      feature,
      key: `${feature}:${index}`,
      mean: EMPTY_PLACEHOLDER,
      median: EMPTY_PLACEHOLDER,
      required: record?.requiredness === 'required',
      stateRates: EMPTY_PLACEHOLDER,
      std: EMPTY_PLACEHOLDER,
      unit: EMPTY_PLACEHOLDER,
      valueKind: EMPTY_PLACEHOLDER,
      vocabulary: EMPTY_PLACEHOLDER,
    };
  });
});

const encodedColumnRows = computed(() =>
  encodedColumns.value.map((column) => ({
    key: field(column.name),
    kind: field(column.kind),
    name: field(column.name),
    source: field(column.source_feature),
  })),
);

function displayRecordValue(record: object, key: unknown) {
  if (typeof key !== 'string') {
    return EMPTY_PLACEHOLDER;
  }
  return (record as Record<string, unknown>)[key] ?? EMPTY_PLACEHOLDER;
}

const isCalibratedReturnModel = computed(
  () => returnModel.value?.calibration === 'calibrated',
);

const [BindModal, bindModalApi] = useVbenModal({
  connectedComponent: ModelBindCalibrationModal,
});
const [BacktestModal, backtestModalApi] = useVbenModal({
  connectedComponent: ModelBacktestModal,
});
const [CpcvModal, cpcvModalApi] = useVbenModal({
  connectedComponent: ModelCpcvModal,
});

function openBindCalibration() {
  const current = model.value;
  if (!current) {
    return;
  }
  bindModalApi
    .setData({
      modelVersionId: current.model_version_id,
      onSubmit: (body: BindCalibrationBody) =>
        submitBindCalibration(current.model_version_id, body),
    })
    .open();
}

function openBacktest() {
  const current = model.value;
  if (!current) {
    return;
  }
  backtestModalApi
    .setData({
      modelVersionId: current.model_version_id,
      onSubmit: (body: BacktestBody) =>
        submitBacktest(current.model_version_id, body),
      trainingDatasetId: current.training_dataset_id ?? undefined,
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

async function submitBindCalibration(
  modelVersionId: string,
  body: BindCalibrationBody,
): Promise<boolean> {
  const result = await governed(
    (ctx) =>
      bindCalibration(modelVersionId, { ...body, reason: ctx.reason }, ctx),
    {
      summary: $t('page.research.models.bindCalibration.summary'),
      title: $t('page.research.models.bindCalibration.title'),
    },
  );
  if (result) {
    openId.value = result.model_version_id;
    model.value = result;
    void refresh(result.model_version_id);
    return true;
  }
  return false;
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

async function submitBindPublishPathSet() {
  const id = model.value?.model_version_id;
  const pathSetId = selectedPathSetId.value;
  if (!id || !pathSetId) {
    return;
  }
  bindPathSetLoading.value = true;
  try {
    const updated = await governed(
      (ctx) =>
        bindPublishPathSet(
          id,
          { path_set_id: pathSetId, reason: ctx.reason },
          ctx,
        ),
      {
        summary: $t('page.research.cpcv.bindSummary', {
          id: pathSetId.slice(0, 8),
        }),
        title: $t('page.research.cpcv.bindTitle'),
      },
    );
    if (updated) {
      message.success($t('page.research.cpcv.bindFeedback'));
      await refresh(id);
    }
  } finally {
    bindPathSetLoading.value = false;
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
  gateLoading.value = true;
  try {
    const [fresh, reports, listed, jobs] = await Promise.all([
      handleRequest(() => getModel(id), { silent: true }),
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
    ]);
    if (openId.value === id) {
      model.value = fresh ?? null;
      if (fresh) {
        modelFamily.value = String(fresh.model_family);
      }
      backtests.value = reports?.items ?? [];
      pathSets.value = listed?.items ?? [];
      const preferred =
        selectedPathSetId.value ??
        fresh?.publish_path_set_id ??
        listed?.items?.[0]?.path_set_id ??
        null;
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
    }
  } finally {
    loading.value = false;
  }
  // The publish gate is a separate dry-run: keep it non-blocking so the summary
  // renders even when readiness evaluation is slow or fails closed.
  try {
    const readiness = await handleRequest(
      () => getModelQualityGate(id, { intent: 'publish' }),
      { silent: true },
    );
    if (openId.value === id) {
      gate.value = readiness ?? null;
    }
  } finally {
    if (openId.value === id) {
      gateLoading.value = false;
    }
  }
}

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<ModelDrawerData>();
      openId.value = data.model.model_version_id;
      model.value = data.model;
      gate.value = null;
      selectedPathSetId.value =
        (typeof route.query.path_set_id === 'string'
          ? route.query.path_set_id
          : null) ??
        data.model.publish_path_set_id ??
        null;
      void refresh(data.model.model_version_id);
    } else {
      openId.value = null;
      model.value = null;
      backtests.value = [];
      pathSets.value = [];
      pathSet.value = null;
      selectedPathSetId.value = null;
      activeCpcvJob.value = null;
      gate.value = null;
    }
  },
});

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
    <Spin :spinning="loading">
      <div v-if="model" class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <Tag :color="statusTag?.color">{{ statusTag?.label }}</Tag>
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
          :title="$t('page.research.models.detail.publishReadiness')"
        >
          <QualityGateScorecard :loading="gateLoading" :report="gate" />
          <Space v-if="needsCpcvRunCta || needsBindCta" class="mt-3">
            <Button v-if="needsCpcvRunCta" type="primary" @click="openCpcv">
              {{ $t('page.research.models.cpcv.action') }}
            </Button>
            <Button
              v-if="needsBindCta"
              type="primary"
              @click="submitBindPublishPathSet"
            >
              {{ $t('page.research.cpcv.bindPublish') }}
            </Button>
          </Space>
        </Card>

        <Card size="small">
          <Tabs destroy-on-hidden>
            <TabPane
              key="input-contract"
              :tab="$t('page.research.models.detail.inputTransform')"
            >
              <div v-if="artifactDiagnostics" class="flex flex-col gap-3">
                <Descriptions :column="2" bordered size="small">
                  <DescriptionsItem
                    :label="
                      $t('page.research.models.detail.artifactFormatVersion')
                    "
                  >
                    {{ field(artifactFormatVersion) }}
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="$t('page.research.models.detail.rawInputCount')"
                  >
                    {{ rawInputRows.length }}
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="
                      $t('page.research.models.detail.encodedColumnCount')
                    "
                  >
                    {{ encodedColumns.length }}
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="$t('page.research.models.detail.transformKind')"
                  >
                    {{ field(artifactDiagnostics.transform_kind) }}
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="
                      $t('page.research.models.detail.trainingDatasetHash')
                    "
                    :span="2"
                  >
                    <span class="font-mono text-xs break-all">
                      {{ field(artifactDiagnostics.training_dataset_hash) }}
                    </span>
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="$t('page.research.models.detail.trainingInputHash')"
                    :span="2"
                  >
                    <span class="font-mono text-xs break-all">
                      {{ field(artifactDiagnostics.training_input_hash) }}
                    </span>
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="$t('page.research.models.detail.inputContractHash')"
                    :span="2"
                  >
                    <span class="font-mono text-xs break-all">
                      {{ field(artifactDiagnostics.input_contract_hash) }}
                    </span>
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="
                      $t('page.research.models.detail.inputTransformHash')
                    "
                    :span="2"
                  >
                    <span class="font-mono text-xs break-all">
                      {{ field(artifactDiagnostics.input_transform_hash) }}
                    </span>
                  </DescriptionsItem>
                  <DescriptionsItem
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

                <div v-if="rawInputRows.length > 0" class="flex flex-col gap-1">
                  <span class="text-sm font-medium">
                    {{ $t('page.research.models.detail.rawInputs') }}
                  </span>
                  <DataList
                    :columns="rawInputColumns"
                    :data-source="rawInputRows"
                    row-key="key"
                    :scroll="{ x: 1180 }"
                  >
                    <template #bodyCell="{ column, record }">
                      <template v-if="column.key === 'required'">
                        <Tag :color="record.required ? 'red' : 'blue'">
                          {{
                            record.required
                              ? $t('page.research.models.detail.required')
                              : $t('page.research.models.detail.optional')
                          }}
                        </Tag>
                      </template>
                      <template v-else>
                        <span class="font-mono text-xs">{{
                          displayRecordValue(record, column.key)
                        }}</span>
                      </template>
                    </template>
                  </DataList>
                </div>

                <div
                  v-if="encodedColumnRows.length > 0"
                  class="flex flex-col gap-1"
                >
                  <span class="text-sm font-medium">
                    {{ $t('page.research.models.detail.encodedColumns') }}
                  </span>
                  <DataList
                    :columns="encodedColumnColumns"
                    :data-source="encodedColumnRows"
                    row-key="key"
                    :scroll="{ x: 640 }"
                  >
                    <template #bodyCell="{ column, record }">
                      <span class="font-mono text-xs">{{
                        displayRecordValue(record, column.key)
                      }}</span>
                    </template>
                  </DataList>
                </div>

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
                  $t('page.research.models.detail.inputTransformUnavailable')
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
                  <EntityRouteLink
                    mono
                    :label="model.trade_policy_artifact_id"
                    :to="`/research/trade-policies?open=${model.trade_policy_artifact_id}`"
                  />
                </DescriptionsItem>
                <DescriptionsItem
                  :label="$t('page.research.models.detail.tradePolicyHash')"
                >
                  <span class="font-mono text-xs break-all">
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
          <Button
            v-if="canBindCalibration"
            class="mt-3"
            type="primary"
            @click="openBindCalibration"
          >
            {{ $t('page.research.models.bindCalibration.action') }}
          </Button>
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
                v-if="trainingObjective.kind"
                :label="$t('page.research.models.detail.objectiveKind')"
              >
                {{ field(trainingObjective.kind) }}
              </DescriptionsItem>
              <DescriptionsItem
                v-if="trainingObjective.rank_loss"
                :label="$t('page.research.models.detail.rankLoss')"
              >
                {{ field(trainingObjective.rank_loss) }}
              </DescriptionsItem>
              <DescriptionsItem
                v-if="trainingObjective.optimizer"
                :label="$t('page.research.models.detail.optimizer')"
              >
                {{ field(trainingObjective.optimizer) }}
              </DescriptionsItem>
              <DescriptionsItem
                v-if="trainingObjective.lambda_tail"
                :label="$t('page.research.models.detail.lambdaTail')"
              >
                {{ field(trainingObjective.lambda_tail) }}
              </DescriptionsItem>
              <DescriptionsItem
                v-if="trainingObjective.tail_fraction"
                :label="$t('page.research.models.detail.tailFraction')"
              >
                {{ field(trainingObjective.tail_fraction) }}
              </DescriptionsItem>
              <DescriptionsItem
                v-if="trainingObjective.lambda_turnover"
                :label="$t('page.research.models.detail.lambdaTurnover')"
              >
                {{ field(trainingObjective.lambda_turnover) }}
              </DescriptionsItem>
              <DescriptionsItem
                v-if="trainingObjective.lambda_l2"
                :label="$t('page.research.models.detail.lambdaL2')"
              >
                {{ field(trainingObjective.lambda_l2) }}
              </DescriptionsItem>
              <DescriptionsItem
                v-if="trainingObjective.ndcg_k !== undefined"
                :label="$t('page.research.models.detail.ndcgK')"
              >
                {{ field(trainingObjective.ndcg_k) }}
              </DescriptionsItem>
              <DescriptionsItem
                v-if="trainingObjective.pseudo_top_n !== undefined"
                :label="$t('page.research.models.detail.pseudoTopN')"
              >
                {{ field(trainingObjective.pseudo_top_n) }}
              </DescriptionsItem>
              <DescriptionsItem
                v-if="trainingObjective.note"
                :label="$t('page.research.models.detail.objectiveNote')"
                :span="2"
              >
                {{ field(trainingObjective.note) }}
              </DescriptionsItem>
            </Descriptions>
            <p
              v-if="trainingObjective.rank_loss && !trainingObjective.kind"
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
              {{ model.model_spec_id }}
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
            :bind-loading="bindPathSetLoading"
            :can-bind="canBindPathSet"
            :gate-outcomes="cpcvGateOutcomes"
            :in-progress="cpcvInProgress"
            :path-set="pathSet"
            :path-sets="pathSets"
            :progress-phase="activeCpcvJob?.progress?.phase ?? null"
            :progress-pct="activeCpcvJob?.progress_pct ?? null"
            :publish-bound-path-set-id="publishBoundPathSetId"
            :selected-path-set-id="selectedPathSetId"
            @bind-publish-path-set="submitBindPublishPathSet"
            @update:selected-path-set-id="selectPathSet"
          />
        </Card>
      </div>
    </Spin>
    <BindModal />
    <BacktestModal />
    <CpcvModal />
  </Drawer>
</template>
