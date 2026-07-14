<script lang="ts" setup>
import type {
  FactorDefinitionView,
  ResearchJobView,
  TradePolicyConditionCandidate,
  TradePolicyConditionTemplateNodeV1,
  TradePolicyFitContract,
  TradePolicyFitPreflightView,
  TrainingDatasetView,
  VerticalActivationTarget,
} from '@vben/types';

import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Tag,
} from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { listFactors, listTrainingDatasets } from '#/api/research';
import {
  fitTradePolicy,
  getTradePolicyFit,
  preflightTradePolicy,
} from '#/api/trade-policies';
import { $t } from '#/locales';
import { useGovernedAction } from '#/shared/composables/use-governed-action';

import ConditionTemplateNodeEditor from '../trade-policies/modules/condition-template-node-editor.vue';

defineOptions({ name: 'TradePolicyFitWorkbenchPage' });

const { handleRequest } = useRequestHandler();
const { governed } = useGovernedAction();
const router = useRouter();
const datasets = ref(new Map<string, TrainingDatasetView>());
const factors = ref<FactorDefinitionView[]>([]);
const activationTarget = ref<VerticalActivationTarget>('semi_auto');
const selectedDatasetId = ref('');
const preflight = ref<null | TradePolicyFitPreflightView>(null);
const pendingContract = ref<null | TradePolicyFitContract>(null);
const fitJob = ref<null | ResearchJobView>(null);
const selectedCandidateId = ref('conditional-1');
let pollTimer: ReturnType<typeof setTimeout> | undefined;

function defaultPrice(): TradePolicyConditionTemplateNodeV1 {
  return {
    comparison: 'at_or_above',
    kind: 'price',
    max_input_age_ms: 2000,
    threshold: '0.5',
  };
}

const candidates = ref<TradePolicyConditionCandidate[]>([
  { candidate_id: 'immediate', condition: { kind: 'immediate' } },
  {
    candidate_id: 'conditional-1',
    condition: {
      confirmation_ms: 2000,
      kind: 'conditional',
      max_observation_gap_ms: 1000,
      root: defaultPrice(),
    },
  },
]);

const selectedCandidate = computed(() =>
  candidates.value.find(
    (candidate) => candidate.candidate_id === selectedCandidateId.value,
  ),
);

const selectedDataset = computed(() => {
  return datasets.value.get(selectedDatasetId.value);
});

const factorOptions = computed(() =>
  factors.value.map((factor) => ({
    definitionHash: factor.definition_hash,
    label: `${factor.name} · ${factor.factor_family}`,
    value: factor.factor_definition_id,
  })),
);

const candidateBlockers = computed(() => {
  const blockers: string[] = [];
  if (candidates.value.length > 16) {
    blockers.push(
      $t('page.research.tradePolicies.workbench.blocker.candidateLimit'),
    );
  }
  const ids = candidates.value.map((candidate) =>
    candidate.candidate_id.trim(),
  );
  if (ids.some((id) => id.length === 0) || new Set(ids).size !== ids.length) {
    blockers.push(
      $t('page.research.tradePolicies.workbench.blocker.candidateIds'),
    );
  }
  if (
    candidates.value.filter(
      (candidate) => candidate.condition.kind === 'immediate',
    ).length !== 1
  ) {
    blockers.push(
      $t('page.research.tradePolicies.workbench.blocker.immediate'),
    );
  }
  return blockers;
});

const canonicalPreview = computed(() =>
  JSON.stringify(
    preflight.value?.canonical_condition_candidates ?? candidates.value,
    null,
    2,
  ),
);

const selectedNodeCount = computed(() => {
  const condition = selectedCandidate.value?.condition;
  return condition?.kind === 'conditional' ? countNodes(condition.root) : 0;
});

const selectedNaturalLanguage = computed(() => {
  const condition = selectedCandidate.value?.condition;
  if (!condition) return '';
  if (condition.kind === 'immediate') {
    return $t('page.research.tradePolicies.workbench.immediateDescription');
  }
  return describeNode(condition.root);
});

function countNodes(node: TradePolicyConditionTemplateNodeV1): number {
  if (node.kind === 'all' || node.kind === 'any') {
    return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
  }
  return 1;
}

function describeNode(node: TradePolicyConditionTemplateNodeV1): string {
  switch (node.kind) {
    case 'all':
    case 'any': {
      const operator = $t(
        `page.research.tradePolicies.workbench.node.${node.kind}`,
      );
      return `${operator}(${node.children.map((child) => describeNode(child)).join(', ')})`;
    }
    case 'clock': {
      return `${node.anchor} ${node.offset_ms >= 0 ? '+' : ''}${node.offset_ms}ms`;
    }
    case 'factor': {
      return `${node.measure} factor ${node.definition_id} ${node.comparison} ${node.threshold}`;
    }
    case 'market_event': {
      return `${node.event.kind} (fresh ≤ ${node.event.max_input_age_ms}ms)`;
    }
    case 'price': {
      return `executable price ${node.comparison} ${node.threshold} (fresh ≤ ${node.max_input_age_ms}ms)`;
    }
  }
}

function parseNotionalTiers(raw: unknown): string[] {
  return String(raw ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

async function collectContract(): Promise<null | TradePolicyFitContract> {
  const validation = await formApi.validate();
  if (Object.keys(validation?.errors ?? {}).length > 0) return null;
  const values = await formApi.getValues();
  const dataset = datasets.value.get(String(values.source_dataset_id ?? ''));
  const window = values.fit_window as [string, string] | undefined;
  const notionalTiers = parseNotionalTiers(values.notional_tiers);
  if (!dataset || !window || notionalTiers.length === 0) {
    message.warning($t('page.research.tradePolicies.fit.incomplete'));
    return null;
  }
  return {
    embargo_secs: Number(values.embargo_secs),
    fit_window_end: window[1],
    fit_window_start: window[0],
    maximum_scale_out_targets: Number(values.maximum_scale_out_targets),
    notional_tiers: notionalTiers,
    pit_cutoff: String(values.pit_cutoff),
    quality_gate: {
      max_ambiguous_touch_rate: String(values.max_ambiguous_touch_rate),
      max_depth_failure_rate: String(values.max_depth_failure_rate),
      max_probability_of_backtest_overfitting: String(values.max_pbo),
      min_cohort_samples: Number(values.min_cohort_samples),
      min_cpcv_paths: Number(values.min_cpcv_paths),
      min_deflated_sharpe_ratio: String(values.min_dsr),
      min_executable_coverage: String(values.min_executable_coverage),
      min_full_l2_coverage: String(values.min_full_l2_coverage),
      min_lower_confidence_utility_bps: String(values.min_utility_bps),
    },
    runtime_config_version_id: dataset.runtime_config_version_id,
    source_dataset_id: dataset.training_dataset_id,
  };
}

async function runPreflight() {
  if (candidateBlockers.value.length > 0) return;
  const contract = await collectContract();
  if (!contract) return;
  const result = await handleRequest(() =>
    preflightTradePolicy({
      activation_target: activationTarget.value,
      condition_candidates: candidates.value,
      contract,
    }),
  );
  if (result) {
    preflight.value = result;
    pendingContract.value = contract;
  }
}

async function enqueueFit() {
  if (!pendingContract.value || !preflight.value) return;
  const job = await governed(
    (context) =>
      fitTradePolicy(
        {
          activation_target: activationTarget.value,
          condition_candidates:
            preflight.value?.canonical_condition_candidates ?? candidates.value,
          contract: pendingContract.value as TradePolicyFitContract,
          reason: context.reason,
        },
        context,
      ),
    {
      summary: $t('page.research.tradePolicies.fit.summary'),
      title: $t('page.research.tradePolicies.fit.title'),
    },
  );
  if (!job) return;
  fitJob.value = job;
  message.success($t('page.research.tradePolicies.fit.queued'));
  schedulePoll();
}

function schedulePoll() {
  if (
    !fitJob.value ||
    ['cancelled', 'failed', 'succeeded'].includes(fitJob.value.status)
  ) {
    return;
  }
  pollTimer = setTimeout(async () => {
    const jobId = fitJob.value?.job_id;
    if (!jobId) return;
    const latest = await handleRequest(() => getTradePolicyFit(jobId), {
      silent: true,
    });
    if (latest) fitJob.value = latest;
    schedulePoll();
  }, 2000);
}

function addCandidate() {
  if (candidates.value.length >= 16) return;
  let ordinal = candidates.value.length;
  let id = `conditional-${ordinal}`;
  while (candidates.value.some((candidate) => candidate.candidate_id === id)) {
    ordinal += 1;
    id = `conditional-${ordinal}`;
  }
  candidates.value.push({
    candidate_id: id,
    condition: {
      confirmation_ms: 2000,
      kind: 'conditional',
      max_observation_gap_ms: 1000,
      root: defaultPrice(),
    },
  });
  selectedCandidateId.value = id;
}

function removeCandidate(id: string) {
  candidates.value = candidates.value.filter(
    (candidate) =>
      candidate.candidate_id !== id || candidate.condition.kind === 'immediate',
  );
  if (
    !candidates.value.some(
      (candidate) => candidate.candidate_id === selectedCandidateId.value,
    )
  ) {
    selectedCandidateId.value = 'immediate';
  }
}

async function loadCatalogs() {
  const [datasetPage, factorPage] = await Promise.all([
    handleRequest(() => listTrainingDatasets({ size: 200, status: 'ready' }), {
      silent: true,
    }),
    handleRequest(() => listFactors({ size: 200, status: 'published' }), {
      silent: true,
    }),
  ]);
  const rows = datasetPage?.items ?? [];
  datasets.value = new Map(rows.map((row) => [row.training_dataset_id, row]));
  factors.value = factorPage?.items ?? [];
  formApi.updateSchema([
    {
      componentProps: {
        onChange: (id: string) => {
          selectedDatasetId.value = id;
          const row = datasets.value.get(id);
          if (row) {
            formApi.setValues({
              fit_window: [row.window_start, row.window_end],
              pit_cutoff: row.window_end,
            });
          }
        },
        optionFilterProp: 'label',
        options: rows.map((row) => ({
          label: `${row.training_dataset_id} · ${row.window_start}`,
          value: row.training_dataset_id,
        })),
        showSearch: true,
      },
      fieldName: 'source_dataset_id',
    },
  ]);
}

const [Form, formApi] = useVbenForm({
  commonConfig: { componentProps: { class: 'w-full' } },
  schema: [
    {
      component: 'Select',
      componentProps: { options: [], showSearch: true },
      fieldName: 'source_dataset_id',
      label: $t('page.research.tradePolicies.fit.dataset'),
      rules: 'selectRequired',
    },
    {
      component: 'RangePicker',
      componentProps: {
        showTime: true,
        valueFormat: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
      },
      fieldName: 'fit_window',
      label: $t('page.research.tradePolicies.fit.window'),
      rules: 'selectRequired',
    },
    {
      component: 'DatePicker',
      componentProps: {
        showTime: true,
        valueFormat: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
      },
      fieldName: 'pit_cutoff',
      label: $t('page.research.tradePolicies.fit.pitCutoff'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { min: 1 },
      defaultValue: 86_400,
      fieldName: 'embargo_secs',
      label: $t('page.research.tradePolicies.fit.embargoSecs'),
      rules: 'required',
    },
    {
      component: 'Input',
      defaultValue: '25,100,500',
      fieldName: 'notional_tiers',
      help: $t('page.research.tradePolicies.fit.notionalTiersHelp'),
      label: $t('page.research.tradePolicies.fit.notionalTiers'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { max: 3, min: 0 },
      defaultValue: 3,
      fieldName: 'maximum_scale_out_targets',
      label: $t('page.research.tradePolicies.fit.maxScaleOutTargets'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { max: 1, min: 0.01, step: 0.01 },
      defaultValue: 0.8,
      fieldName: 'min_executable_coverage',
      label: $t('page.research.tradePolicies.fit.minimumCoverage'),
      rules: 'required',
    },
    ...[
      ['min_full_l2_coverage', 0.8],
      ['max_ambiguous_touch_rate', 0.05],
      ['max_depth_failure_rate', 0.05],
      ['min_dsr', 0],
      ['max_pbo', 0.5],
    ].map(([fieldName, defaultValue]) => ({
      component: 'InputNumber' as const,
      componentProps: { max: 1, min: 0, step: 0.01 },
      defaultValue,
      fieldName: String(fieldName),
      label: $t(`page.research.tradePolicies.fit.${fieldName}`),
      rules: 'required' as const,
    })),
    {
      component: 'InputNumber',
      componentProps: { min: 1 },
      defaultValue: 100,
      fieldName: 'min_cohort_samples',
      label: $t('page.research.tradePolicies.fit.min_cohort_samples'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { min: 1 },
      defaultValue: 10,
      fieldName: 'min_cpcv_paths',
      label: $t('page.research.tradePolicies.fit.min_cpcv_paths'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      defaultValue: 0,
      fieldName: 'min_utility_bps',
      label: $t('page.research.tradePolicies.fit.min_utility_bps'),
      rules: 'required',
    },
  ],
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
});

watch(
  [candidates, activationTarget],
  () => {
    preflight.value = null;
    pendingContract.value = null;
  },
  { deep: true },
);

onBeforeUnmount(() => {
  if (pollTimer) clearTimeout(pollTimer);
});

void loadCatalogs();
</script>

<template>
  <Page :title="$t('page.research.tradePolicies.workbench.title')">
    <div class="workbench">
      <Card
        class="frozen-card"
        :title="$t('page.research.tradePolicies.workbench.frozen')"
      >
        <Form />
        <Descriptions :column="1" size="small">
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.workbench.activation')"
          >
            <Select
              v-model:value="activationTarget"
              :options="[
                { label: 'SemiAuto', value: 'semi_auto' },
                { label: 'AutoExecution', value: 'auto_execution' },
              ]"
            />
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.workbench.runtime')"
          >
            {{ selectedDataset?.runtime_config_version_id ?? '—' }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.tradePolicies.workbench.model')"
          >
            {{ selectedDataset?.model_spec_id ?? '—' }}
          </DescriptionsItem>
        </Descriptions>
      </Card>

      <section class="builder-grid">
        <Card :title="$t('page.research.tradePolicies.workbench.candidates')">
          <div class="candidate-list">
            <div
              v-for="item in candidates"
              :key="item.candidate_id"
              class="candidate-row"
              :class="{ selected: item.candidate_id === selectedCandidateId }"
              @click="selectedCandidateId = item.candidate_id"
            >
              <div>
                <strong>{{ item.candidate_id }}</strong>
                <Tag class="ml-2">{{ item.condition.kind }}</Tag>
              </div>
              <Button
                v-if="item.condition.kind !== 'immediate'"
                danger
                size="small"
                @click.stop="removeCandidate(item.candidate_id)"
              >
                {{ $t('common.delete') }}
              </Button>
            </div>
          </div>
          <Button
            block
            class="mt-3"
            :disabled="candidates.length >= 16"
            @click="addCandidate"
          >
            {{ $t('page.research.tradePolicies.workbench.addCandidate') }}
          </Button>
        </Card>

        <Card :title="$t('page.research.tradePolicies.workbench.editor')">
          <Empty v-if="!selectedCandidate" />
          <Alert
            v-else-if="selectedCandidate.condition.kind === 'immediate'"
            :message="
              $t('page.research.tradePolicies.workbench.immediateFixed')
            "
            show-icon
            type="info"
          />
          <template v-else>
            <div class="condition-meta">
              <label>
                <span>{{
                  $t('page.research.tradePolicies.workbench.candidateId')
                }}</span>
                <Input v-model:value="selectedCandidate.candidate_id" />
              </label>
              <label>
                <span>{{
                  $t('page.research.tradePolicies.workbench.confirmation')
                }}</span>
                <InputNumber
                  v-model:value="selectedCandidate.condition.confirmation_ms"
                  :min="0"
                />
              </label>
              <label>
                <span>{{
                  $t('page.research.tradePolicies.workbench.observationGap')
                }}</span>
                <InputNumber
                  v-model:value="
                    selectedCandidate.condition.max_observation_gap_ms
                  "
                  :min="0"
                />
              </label>
            </div>
            <ConditionTemplateNodeEditor
              v-model="selectedCandidate.condition.root"
              :factor-options="factorOptions"
            />
          </template>
        </Card>

        <Card :title="$t('page.research.tradePolicies.workbench.inspector')">
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.research.tradePolicies.workbench.nodeCount')"
            >
              {{ selectedNodeCount }} / 32
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.tradePolicies.workbench.candidateCount')
              "
            >
              {{ candidates.length }} / 16
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.tradePolicies.workbench.naturalLanguage')
              "
            >
              {{ selectedNaturalLanguage || '—' }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.tradePolicies.workbench.candidateHash')"
            >
              {{ preflight?.condition_candidate_set_hash ?? '—' }}
            </DescriptionsItem>
          </Descriptions>
          <Alert
            v-for="blocker in candidateBlockers"
            :key="blocker"
            class="mt-3"
            :message="blocker"
            show-icon
            type="error"
          />
          <pre class="canonical-tree">{{ canonicalPreview }}</pre>
        </Card>
      </section>

      <Card :title="$t('page.research.tradePolicies.workbench.preflight')">
        <div aria-live="polite">
          <Alert
            v-if="preflight"
            :message="
              preflight.publishable_input === 'pass'
                ? $t('page.research.tradePolicies.fit.publishable')
                : $t('page.research.tradePolicies.fit.shadowOnly')
            "
            show-icon
            :type="
              preflight.publishable_input === 'pass' ? 'success' : 'warning'
            "
          />
          <div v-if="preflight" class="preflight-checks">
            <Tag
              :color="preflight.contract_valid === 'pass' ? 'success' : 'error'"
            >
              {{ $t('page.research.tradePolicies.fit.contractValid') }} ·
              {{ preflight.contract_valid }}
            </Tag>
            <Tag
              :color="
                preflight.source_dataset_ready === 'pass' ? 'success' : 'error'
              "
            >
              {{ $t('page.research.tradePolicies.fit.datasetReady') }} ·
              {{ preflight.source_dataset_ready }}
            </Tag>
            <Tag
              :color="
                preflight.full_l2_trajectory_present === 'pass'
                  ? 'success'
                  : 'error'
              "
            >
              {{ $t('page.research.tradePolicies.fit.fullL2') }} ·
              {{ preflight.full_l2_trajectory_present }}
            </Tag>
            <Tag
              :color="
                preflight.fee_model_present === 'pass' ? 'success' : 'error'
              "
            >
              {{ $t('page.research.tradePolicies.fit.fees') }} ·
              {{ preflight.fee_model_present }}
            </Tag>
          </div>
          <Alert
            v-for="item in preflight?.messages ?? []"
            :key="item"
            class="mt-2"
            :message="item"
            show-icon
            type="info"
          />
        </div>
        <Space class="mt-4">
          <Button
            :disabled="candidateBlockers.length > 0"
            @click="runPreflight"
          >
            {{ $t('page.research.tradePolicies.fit.preflight') }}
          </Button>
          <Button :disabled="!preflight" type="primary" @click="enqueueFit">
            {{ $t('page.research.tradePolicies.fit.enqueue') }}
          </Button>
        </Space>
      </Card>

      <Card
        v-if="fitJob"
        :title="$t('page.research.tradePolicies.workbench.result')"
      >
        <div aria-live="polite">
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem label="Job">{{ fitJob.job_id }}</DescriptionsItem>
            <DescriptionsItem label="Status">
              {{ fitJob.status }}
            </DescriptionsItem>
            <DescriptionsItem label="Result">
              {{ fitJob.result_ref ?? '—' }}
            </DescriptionsItem>
          </Descriptions>
          <Button
            class="mt-3"
            @click="router.push(`/research/jobs?open=${fitJob!.job_id}`)"
          >
            {{ $t('page.research.tradePolicies.workbench.openJob') }}
          </Button>
        </div>
      </Card>
    </div>
  </Page>
</template>

<style scoped>
.workbench {
  display: grid;
  gap: 16px;
}

.builder-grid {
  display: grid;
  grid-template-columns: minmax(220px, 0.7fr) minmax(360px, 1.6fr) minmax(
      280px,
      1fr
    );
  gap: 16px;
}

.condition-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.condition-meta label {
  display: grid;
  gap: 4px;
}

.condition-meta label > span {
  font-size: 12px;
  color: var(--vben-text-color-secondary);
}

.candidate-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--vben-border-color);
}

.candidate-list {
  overflow: hidden;
  border: 1px solid var(--vben-border-color);
  border-bottom: 0;
  border-radius: 6px;
}

.candidate-row.selected {
  background: var(--vben-bg-color-secondary);
}

.canonical-tree {
  max-height: 420px;
  padding: 12px;
  margin-top: 12px;
  overflow: auto;
  font-size: 12px;
  white-space: pre-wrap;
  background: var(--vben-bg-color-secondary);
  border-radius: 6px;
}

.preflight-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

:deep(.ant-input-number),
:deep(.ant-select),
:deep(.ant-picker) {
  width: 100%;
}

@media (max-width: 1200px) {
  .builder-grid {
    grid-template-columns: 1fr 2fr;
  }

  .builder-grid > :last-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 760px) {
  .builder-grid,
  .condition-meta {
    grid-template-columns: 1fr;
  }

  .builder-grid > :last-child {
    grid-column: auto;
  }
}
</style>
