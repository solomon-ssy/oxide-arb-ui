<script lang="ts" setup>
import type {
  ExitReason,
  FactorDefinitionView,
  ResearchJobView,
  TradePolicyCandidateSpec,
  TradePolicyConditionTemplateNodeV1,
  TradePolicyFitPreflightView,
  TradePolicyFitSelection,
  TrainingDatasetView,
  VerticalActivationTarget,
} from '@vben/types';

import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Divider,
  Empty,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Switch,
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
const selectedDatasetId = ref('');
const preflight = ref<null | TradePolicyFitPreflightView>(null);
const pendingSelection = ref<null | TradePolicyFitSelection>(null);
const fitJob = ref<null | ResearchJobView>(null);
const activationTarget = ref<VerticalActivationTarget>('semi_auto');
const selectedCandidateId = ref('conditional-1');
const candidateList = ref<HTMLElement | null>(null);
let pollTimer: ReturnType<typeof setTimeout> | undefined;

function defaultPrice(): TradePolicyConditionTemplateNodeV1 {
  return {
    comparison: 'at_or_above',
    kind: 'price',
    max_input_age_ms: 2000,
    threshold: '0.5',
  };
}

const EXIT_REASONS: ExitReason[] = [
  'take_profit',
  'stop_loss',
  'time_exit',
  'partial_exit',
  'signal_invalidated',
  'opportunistic',
  'manual',
  'settlement_hold',
  'resolution_redeem',
  'kill_switch_emergency',
  'risk_envelope_breached',
  'market_abnormal',
  'data_stale',
];

function defaultExit(): TradePolicyCandidateSpec['exit'] {
  return {
    lower_barrier_bps: '-500',
    min_expected_return_bps: '0',
    min_score_retention: '0.5',
    opportunistic_exit: {
      max_cumulative_exit_pct: '1',
      min_confidence: '0.65',
      min_expected_alpha_bps: '50',
      min_incremental_exit_pct: '0.1',
      min_p_exit_better: '0.5',
    },
    reason_execution: EXIT_REASONS.map((reason) => ({
      fill_requirement: 'allow_partial',
      max_attempts: 3,
      max_slippage_bps: '100',
      reason,
      residual_share_policy: 'retry_until_vertical',
      retry_cadence_ms: 1000,
    })),
    redeem_policy: 'manual',
    require_execution_eligibility: true,
    scale_out_targets: [],
    settlement_mode: 'exit_before_resolution',
    trailing_stop: null,
    upper_barrier_bps: '500',
    vertical_barrier_secs: 3600,
  };
}

function defaultCandidate(
  candidateId: string,
  entryCondition: TradePolicyCandidateSpec['entry_condition'],
): TradePolicyCandidateSpec {
  return {
    candidate_id: candidateId,
    entry_condition: entryCondition,
    entry_execution: {
      fill_requirement: 'all_or_nothing',
      kind: 'aggressive',
      max_book_age_ms: 2000,
      max_slippage_bps: '100',
    },
    exit: defaultExit(),
  };
}

const candidates = ref<TradePolicyCandidateSpec[]>([
  defaultCandidate('immediate', { kind: 'immediate' }),
  defaultCandidate('conditional-1', {
    confirmation_ms: 2000,
    kind: 'conditional',
    max_observation_gap_ms: 1000,
    root: defaultPrice(),
  }),
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
  if (candidates.value.length > 32) {
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
      (candidate) => candidate.entry_condition.kind === 'immediate',
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
    preflight.value?.canonical_candidates ?? candidates.value,
    null,
    2,
  ),
);

const selectedNodeCount = computed(() => {
  const condition = selectedCandidate.value?.entry_condition;
  return condition?.kind === 'conditional' ? countNodes(condition.root) : 0;
});

const selectedNaturalLanguage = computed(() => {
  const condition = selectedCandidate.value?.entry_condition;
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

async function collectSelection(): Promise<null | TradePolicyFitSelection> {
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
    fit_window_end: window[1],
    fit_window_start: window[0],
    notional_tiers: notionalTiers,
    pit_cutoff: String(values.pit_cutoff),
    quality_gate: null,
    source_dataset_id: dataset.training_dataset_id,
  };
}

async function runPreflight() {
  if (candidateBlockers.value.length > 0) return;
  const selection = await collectSelection();
  if (!selection) return;
  const result = await handleRequest(() =>
    preflightTradePolicy({
      activation_target: activationTarget.value,
      candidates: candidates.value,
      selection,
    }),
  );
  if (result) {
    preflight.value = result;
    pendingSelection.value = selection;
  }
}

async function enqueueFit() {
  if (!pendingSelection.value || !preflight.value) return;
  const job = await governed(
    (context) =>
      fitTradePolicy(
        {
          activation_target: activationTarget.value,
          candidates: preflight.value?.canonical_candidates ?? candidates.value,
          reason: context.reason,
          selection: pendingSelection.value as TradePolicyFitSelection,
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
  if (candidates.value.length >= 32) return;
  let ordinal = candidates.value.length;
  let id = `conditional-${ordinal}`;
  while (candidates.value.some((candidate) => candidate.candidate_id === id)) {
    ordinal += 1;
    id = `conditional-${ordinal}`;
  }
  candidates.value.push({
    ...defaultCandidate(id, {
      confirmation_ms: 2000,
      kind: 'conditional',
      max_observation_gap_ms: 1000,
      root: defaultPrice(),
    }),
  });
  selectedCandidateId.value = id;
}

function selectCandidate(id: string) {
  selectedCandidateId.value = id;
}

function renameSelectedCandidate(nextId: string) {
  const selected = selectedCandidate.value;
  if (!selected || selected.entry_condition.kind === 'immediate') return;
  selected.candidate_id = nextId;
  selectedCandidateId.value = nextId;
}

function focusCandidate(index: number) {
  void nextTick(() => {
    const options =
      candidateList.value?.querySelectorAll<HTMLElement>('[role="option"]');
    options?.item(index).focus();
  });
}

function selectCandidateAt(index: number) {
  const candidate = candidates.value[index];
  if (!candidate) return false;
  selectCandidate(candidate.candidate_id);
  return true;
}

function handleCandidateKeydown(event: KeyboardEvent, index: number) {
  let target: number;
  switch (event.key) {
    case ' ':
    case 'Enter': {
      selectCandidateAt(index);
      event.preventDefault();
      return;
    }
    case 'ArrowDown': {
      target = Math.min(index + 1, candidates.value.length - 1);
      break;
    }
    case 'ArrowUp': {
      target = Math.max(index - 1, 0);
      break;
    }
    case 'End': {
      target = candidates.value.length - 1;
      break;
    }
    case 'Home': {
      target = 0;
      break;
    }
    default: {
      return;
    }
  }
  event.preventDefault();
  if (selectCandidateAt(target)) focusCandidate(target);
}

function removeCandidate(id: string) {
  candidates.value = candidates.value.filter(
    (candidate) =>
      candidate.candidate_id !== id ||
      candidate.entry_condition.kind === 'immediate',
  );
  if (
    !candidates.value.some(
      (candidate) => candidate.candidate_id === selectedCandidateId.value,
    )
  ) {
    selectedCandidateId.value = 'immediate';
  }
}

function setEntryExecutionKind(kind: unknown) {
  if (kind !== 'aggressive' && kind !== 'passive_post_only') return;
  const candidate = selectedCandidate.value;
  if (!candidate || candidate.entry_execution.kind === kind) return;
  candidate.entry_execution =
    kind === 'aggressive'
      ? {
          fill_requirement: 'all_or_nothing',
          kind,
          max_book_age_ms: 2000,
          max_slippage_bps: '100',
        }
      : {
          good_til_secs: 30,
          kind,
          max_book_age_ms: 2000,
          placement: { kind: 'join_best_bid' },
        };
}

function setPassivePlacementKind(kind: unknown) {
  if (kind !== 'improve_best_bid_by_ticks' && kind !== 'join_best_bid') return;
  const execution = selectedCandidate.value?.entry_execution;
  if (!execution || execution.kind !== 'passive_post_only') return;
  execution.placement =
    kind === 'join_best_bid' ? { kind } : { kind, ticks: 1 };
}

function addScaleOutTarget() {
  const targets = selectedCandidate.value?.exit.scale_out_targets;
  if (!targets || targets.length >= 3) return;
  const ordinal = targets.length + 1;
  targets.push({
    target_cumulative_exit_pct: String(ordinal / 3),
    target_id: `scale-${ordinal}`,
    trigger_return_bps: String(ordinal * 200),
  });
}

function removeScaleOutTarget(index: number) {
  selectedCandidate.value?.exit.scale_out_targets.splice(index, 1);
}

function toggleTrailingStop(enabled: unknown) {
  if (typeof enabled !== 'boolean') return;
  const exit = selectedCandidate.value?.exit;
  if (!exit) return;
  exit.trailing_stop = enabled
    ? { activation_return_bps: '300', trail_bps: '100' }
    : null;
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
  const rows = (datasetPage?.items ?? []).filter(
    (dataset) => dataset.purpose === 'policy_fit',
  );
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
  handleValuesChange: () => {
    preflight.value = null;
    pendingSelection.value = null;
  },
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
      component: 'Input',
      defaultValue: '25,100,500',
      fieldName: 'notional_tiers',
      help: $t('page.research.tradePolicies.fit.notionalTiersHelp'),
      label: $t('page.research.tradePolicies.fit.notionalTiers'),
      rules: 'required',
    },
  ],
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
});

watch(
  candidates,
  () => {
    preflight.value = null;
    pendingSelection.value = null;
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
                {
                  disabled: true,
                  label: 'AutoExecution · blocked in Runtime v13',
                  value: 'auto_execution',
                },
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
          <div
            ref="candidateList"
            :aria-label="$t('page.research.tradePolicies.workbench.candidates')"
            class="candidate-list"
            role="listbox"
          >
            <div
              v-for="(item, index) in candidates"
              :key="item.candidate_id"
              class="candidate-row"
              :class="{ selected: item.candidate_id === selectedCandidateId }"
            >
              <button
                :aria-selected="item.candidate_id === selectedCandidateId"
                class="candidate-select"
                role="option"
                :tabindex="item.candidate_id === selectedCandidateId ? 0 : -1"
                type="button"
                @click="selectCandidate(item.candidate_id)"
                @keydown="handleCandidateKeydown($event, index)"
              >
                <strong>{{ item.candidate_id }}</strong>
                <Tag class="ml-2">{{ item.entry_condition.kind }}</Tag>
                <Tag class="ml-2">{{ item.entry_execution.kind }}</Tag>
              </button>
              <Button
                v-if="item.entry_condition.kind !== 'immediate'"
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
            :disabled="candidates.length >= 32"
            @click="addCandidate"
          >
            {{ $t('page.research.tradePolicies.workbench.addCandidate') }}
          </Button>
        </Card>

        <Card :title="$t('page.research.tradePolicies.workbench.editor')">
          <Empty v-if="!selectedCandidate" />
          <template v-else>
            <Alert
              v-if="selectedCandidate.entry_condition.kind === 'immediate'"
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
                  <Input
                    :value="selectedCandidate.candidate_id"
                    @update:value="renameSelectedCandidate"
                  />
                </label>
                <label>
                  <span>{{
                    $t('page.research.tradePolicies.workbench.confirmation')
                  }}</span>
                  <InputNumber
                    v-model:value="
                      selectedCandidate.entry_condition.confirmation_ms
                    "
                    :min="0"
                  />
                </label>
                <label>
                  <span>{{
                    $t('page.research.tradePolicies.workbench.observationGap')
                  }}</span>
                  <InputNumber
                    v-model:value="
                      selectedCandidate.entry_condition.max_observation_gap_ms
                    "
                    :min="0"
                  />
                </label>
              </div>
              <ConditionTemplateNodeEditor
                v-model="selectedCandidate.entry_condition.root"
                :factor-options="factorOptions"
              />
            </template>

            <Divider title-placement="start">
              {{ $t('page.research.tradePolicies.workbench.entryExecution') }}
            </Divider>
            <div class="condition-meta">
              <label>
                <span>{{
                  $t('page.research.tradePolicies.workbench.orderKind')
                }}</span>
                <Select
                  :options="[
                    { label: 'Aggressive FOK/FAK', value: 'aggressive' },
                    {
                      label: 'Passive post-only GTD',
                      value: 'passive_post_only',
                    },
                  ]"
                  :value="selectedCandidate.entry_execution.kind"
                  @update:value="setEntryExecutionKind"
                />
              </label>
              <label>
                <span>{{
                  $t('page.research.tradePolicies.workbench.maxBookAge')
                }}</span>
                <InputNumber
                  v-model:value="
                    selectedCandidate.entry_execution.max_book_age_ms
                  "
                  :min="1"
                />
              </label>
              <template
                v-if="selectedCandidate.entry_execution.kind === 'aggressive'"
              >
                <label>
                  <span>{{
                    $t('page.research.tradePolicies.workbench.fillRequirement')
                  }}</span>
                  <Select
                    v-model:value="
                      selectedCandidate.entry_execution.fill_requirement
                    "
                    :options="[
                      { label: 'FOK', value: 'all_or_nothing' },
                      { label: 'FAK', value: 'allow_partial' },
                    ]"
                  />
                </label>
                <label>
                  <span>{{
                    $t('page.research.tradePolicies.workbench.maxSlippage')
                  }}</span>
                  <Input
                    v-model:value="
                      selectedCandidate.entry_execution.max_slippage_bps
                    "
                  />
                </label>
              </template>
              <template v-else>
                <label>
                  <span>{{
                    $t('page.research.tradePolicies.workbench.passivePlacement')
                  }}</span>
                  <Select
                    :options="[
                      { label: 'Join best bid', value: 'join_best_bid' },
                      {
                        label: 'Improve best bid by ticks',
                        value: 'improve_best_bid_by_ticks',
                      },
                    ]"
                    :value="selectedCandidate.entry_execution.placement.kind"
                    @update:value="setPassivePlacementKind"
                  />
                </label>
                <label
                  v-if="
                    selectedCandidate.entry_execution.placement.kind ===
                    'improve_best_bid_by_ticks'
                  "
                >
                  <span>{{
                    $t('page.research.tradePolicies.workbench.improveTicks')
                  }}</span>
                  <InputNumber
                    v-model:value="
                      selectedCandidate.entry_execution.placement.ticks
                    "
                    :min="1"
                  />
                </label>
                <label>
                  <span>{{
                    $t('page.research.tradePolicies.workbench.goodTil')
                  }}</span>
                  <InputNumber
                    v-model:value="
                      selectedCandidate.entry_execution.good_til_secs
                    "
                    :min="1"
                  />
                </label>
              </template>
            </div>

            <Divider title-placement="start">
              {{ $t('page.research.tradePolicies.workbench.exitPolicy') }}
            </Divider>
            <div class="condition-meta">
              <label>
                <span>{{
                  $t('page.research.tradePolicies.workbench.upperBarrier')
                }}</span>
                <Input
                  v-model:value="selectedCandidate.exit.upper_barrier_bps"
                />
              </label>
              <label>
                <span>{{
                  $t('page.research.tradePolicies.workbench.lowerBarrier')
                }}</span>
                <Input
                  v-model:value="selectedCandidate.exit.lower_barrier_bps"
                />
              </label>
              <label>
                <span>{{
                  $t('page.research.tradePolicies.workbench.verticalBarrier')
                }}</span>
                <InputNumber
                  v-model:value="selectedCandidate.exit.vertical_barrier_secs"
                  :min="1"
                />
              </label>
              <label>
                <span>{{
                  $t('page.research.tradePolicies.workbench.scoreRetention')
                }}</span>
                <Input
                  v-model:value="selectedCandidate.exit.min_score_retention"
                />
              </label>
              <label>
                <span>{{
                  $t('page.research.tradePolicies.workbench.expectedReturn')
                }}</span>
                <Input
                  v-model:value="selectedCandidate.exit.min_expected_return_bps"
                />
              </label>
              <label>
                <span>{{
                  $t('page.research.tradePolicies.workbench.sellConfidence')
                }}</span>
                <Input
                  v-model:value="
                    selectedCandidate.exit.opportunistic_exit.min_confidence
                  "
                />
              </label>
              <label>
                <span>{{
                  $t('page.research.tradePolicies.workbench.sellAlpha')
                }}</span>
                <Input
                  v-model:value="
                    selectedCandidate.exit.opportunistic_exit
                      .min_expected_alpha_bps
                  "
                />
              </label>
              <label>
                <span>{{
                  $t('page.research.tradePolicies.workbench.sellProbability')
                }}</span>
                <Input
                  v-model:value="
                    selectedCandidate.exit.opportunistic_exit.min_p_exit_better
                  "
                />
              </label>
              <label>
                <span>{{
                  $t('page.research.tradePolicies.workbench.sellCap')
                }}</span>
                <Input
                  v-model:value="
                    selectedCandidate.exit.opportunistic_exit
                      .max_cumulative_exit_pct
                  "
                />
              </label>
              <label>
                <span>{{
                  $t('page.research.tradePolicies.workbench.sellMinClip')
                }}</span>
                <Input
                  v-model:value="
                    selectedCandidate.exit.opportunistic_exit
                      .min_incremental_exit_pct
                  "
                />
              </label>
              <label>
                <span>{{
                  $t('page.research.tradePolicies.workbench.settlementMode')
                }}</span>
                <Select
                  v-model:value="selectedCandidate.exit.settlement_mode"
                  :options="[
                    {
                      label: 'Exit before resolution',
                      value: 'exit_before_resolution',
                    },
                    {
                      label: 'Hold to resolution',
                      value: 'hold_to_resolution',
                    },
                  ]"
                />
              </label>
              <label>
                <span>{{
                  $t('page.research.tradePolicies.workbench.redeemPolicy')
                }}</span>
                <Select
                  v-model:value="selectedCandidate.exit.redeem_policy"
                  :options="[
                    { label: 'Manual', value: 'manual' },
                    { label: 'Auto', value: 'auto' },
                  ]"
                />
              </label>
              <label>
                <span>{{
                  $t(
                    'page.research.tradePolicies.workbench.executionEligibility',
                  )
                }}</span>
                <Switch
                  v-model:checked="
                    selectedCandidate.exit.require_execution_eligibility
                  "
                />
              </label>
            </div>

            <Divider title-placement="start">
              {{ $t('page.research.tradePolicies.workbench.scaleOut') }}
            </Divider>
            <div
              v-for="(target, index) in selectedCandidate.exit
                .scale_out_targets"
              :key="target.target_id"
              class="reason-rule"
            >
              <Input v-model:value="target.target_id" />
              <Input v-model:value="target.trigger_return_bps" />
              <Input v-model:value="target.target_cumulative_exit_pct" />
              <Button danger @click="removeScaleOutTarget(index)">
                {{ $t('common.delete') }}
              </Button>
            </div>
            <Button
              :disabled="selectedCandidate.exit.scale_out_targets.length >= 3"
              @click="addScaleOutTarget"
            >
              {{ $t('page.research.tradePolicies.workbench.addScaleOut') }}
            </Button>
            <div class="trailing-toggle">
              <span>{{
                $t('page.research.tradePolicies.workbench.trailingStop')
              }}</span>
              <Switch
                :checked="selectedCandidate.exit.trailing_stop !== null"
                @update:checked="toggleTrailingStop"
              />
            </div>
            <div
              v-if="selectedCandidate.exit.trailing_stop"
              class="condition-meta"
            >
              <label>
                <span>{{
                  $t('page.research.tradePolicies.workbench.trailingActivation')
                }}</span>
                <Input
                  v-model:value="
                    selectedCandidate.exit.trailing_stop.activation_return_bps
                  "
                />
              </label>
              <label>
                <span>{{
                  $t('page.research.tradePolicies.workbench.trailingDistance')
                }}</span>
                <Input
                  v-model:value="selectedCandidate.exit.trailing_stop.trail_bps"
                />
              </label>
            </div>

            <Divider title-placement="start">
              {{ $t('page.research.tradePolicies.workbench.exitExecution') }}
            </Divider>
            <div
              v-for="rule in selectedCandidate.exit.reason_execution"
              :key="rule.reason"
              class="reason-rule"
            >
              <code>{{ rule.reason }}</code>
              <InputNumber v-model:value="rule.max_attempts" :min="1" />
              <InputNumber v-model:value="rule.retry_cadence_ms" :min="1" />
              <Input v-model:value="rule.max_slippage_bps" />
              <Select
                v-model:value="rule.residual_share_policy"
                :options="[
                  {
                    label: 'Retry until vertical',
                    value: 'retry_until_vertical',
                  },
                  { label: 'Hold to settlement', value: 'hold_to_settlement' },
                  {
                    label: 'Redeem after resolution',
                    value: 'redeem_after_resolution',
                  },
                ]"
              />
            </div>
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
              {{ candidates.length }} / 32
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
              {{ preflight?.candidate_set_hash ?? '—' }}
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
          <pre class="canonical-tree canonical-tree-desktop">{{
            canonicalPreview
          }}</pre>
          <details class="canonical-tree-mobile">
            <summary>
              {{ $t('page.research.tradePolicies.workbench.canonicalJson') }}
            </summary>
            <pre class="canonical-tree">{{ canonicalPreview }}</pre>
          </details>
        </Card>
      </section>

      <Card :title="$t('page.research.tradePolicies.workbench.preflight')">
        <div aria-live="polite">
          <Alert
            :message="$t('page.research.tradePolicies.fit.readinessCapability')"
            show-icon
            type="info"
          />
          <Alert
            v-if="preflight"
            class="mt-2"
            :message="
              preflight.publishable_input === 'pass'
                ? $t('page.research.tradePolicies.fit.publishable')
                : $t('page.research.tradePolicies.fit.blocked')
            "
            show-icon
            :type="preflight.publishable_input === 'pass' ? 'success' : 'error'"
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
                preflight.source_dataset_policy_fit === 'pass'
                  ? 'success'
                  : 'error'
              "
            >
              {{ $t('page.research.tradePolicies.fit.datasetPurpose') }} ·
              {{ preflight.source_dataset_policy_fit }}
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
            <Tag
              :color="
                preflight.latency_profile_present === 'pass'
                  ? 'success'
                  : 'error'
              "
            >
              {{ $t('page.research.tradePolicies.fit.latencyProfile') }} ·
              {{ preflight.latency_profile_present }}
            </Tag>
            <Tag
              :color="
                preflight.requested_gate_tight_enough === 'pass'
                  ? 'success'
                  : 'error'
              "
            >
              {{ $t('page.research.tradePolicies.fit.runtimeFloor') }} ·
              {{ preflight.requested_gate_tight_enough }}
            </Tag>
          </div>
          <Descriptions v-if="preflight" :column="1" class="mt-3" size="small">
            <DescriptionsItem
              :label="$t('page.research.tradePolicies.workbench.runtime')"
            >
              {{ preflight.runtime_config_version_id ?? '—' }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.tradePolicies.fit.methodologyHash')"
            >
              {{ preflight.methodology_hash ?? '—' }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.tradePolicies.fit.effectiveGates')"
            >
              <pre class="gate-json">{{
                JSON.stringify(preflight.runtime_quality_gate, null, 2)
              }}</pre>
            </DescriptionsItem>
          </Descriptions>
          <Alert
            v-for="item in preflight?.messages ?? []"
            :key="item"
            class="mt-2"
            :message="item"
            show-icon
            type="info"
          />
        </div>
        <Space class="operation-bar mt-4">
          <Button
            :disabled="candidateBlockers.length > 0"
            @click="runPreflight"
          >
            {{ $t('page.research.tradePolicies.fit.preflight') }}
          </Button>
          <Button
            :disabled="preflight?.publishable_input !== 'pass'"
            type="primary"
            @click="enqueueFit"
          >
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
  border-bottom: 1px solid var(--vben-border-color);
}

.candidate-select {
  flex: 1;
  min-width: 0;
  padding: 0;
  text-align: start;
  cursor: pointer;
  outline: none;
  background: transparent;
  border: 0;
}

.candidate-select:focus-visible {
  outline: 2px solid var(--vben-primary-color);
  outline-offset: 3px;
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

.canonical-tree-mobile {
  display: none;
}

.operation-bar {
  position: sticky;
  bottom: 0;
  z-index: 10;
  width: 100%;
  padding: 12px 0;
  background: var(--vben-bg-color);
  border-top: 1px solid var(--vben-border-color);
}

.preflight-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.gate-json {
  max-height: 240px;
  overflow: auto;
  font-size: 12px;
  white-space: pre-wrap;
}

.reason-rule {
  display: grid;
  grid-template-columns: minmax(150px, 1.4fr) repeat(4, minmax(110px, 1fr));
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.trailing-toggle {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 12px 0;
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
  .condition-meta,
  .reason-rule {
    grid-template-columns: 1fr;
  }

  .builder-grid > :last-child {
    grid-column: auto;
  }

  .canonical-tree-desktop {
    display: none;
  }

  .canonical-tree-mobile {
    display: block;
  }

  .canonical-tree-mobile > summary {
    padding: 8px 0;
    font-weight: 500;
    cursor: pointer;
  }
}
</style>
