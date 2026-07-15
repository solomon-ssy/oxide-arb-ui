<script lang="ts" setup>
import type { StepItem, TableColumnsType } from 'antdv-next';

import type {
  ExitReason,
  FactorDefinitionView,
  ResearchEvaluationTrack,
  ResearchJobView,
  ResearchProfileArtifact,
  TradePolicyCandidateSpec,
  TradePolicyConditionTemplateNodeV1,
  TradePolicyFitPreflightView,
  TradePolicyFitSelection,
  TradePolicyOperationalEvidenceView,
  TradePolicyPreflightCheckStatus,
  TradePolicyTrialAttemptView,
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
  Empty,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Steps,
  Table,
  Tag,
} from 'antdv-next';

import { cancelResearchJob, listFactors } from '#/api/research';
import {
  fitTradePolicy,
  getTradePolicyFit,
  listTradePolicyFitTrials,
  listTradePolicyProfiles,
  preflightTradePolicy,
} from '#/api/trade-policies';
import { $t } from '#/locales';
import { formatDateTimeLocal, formatUsd } from '#/shared/components/format';
import { useGovernedAction } from '#/shared/composables/use-governed-action';

import ConditionTemplateNodeEditor from '../trade-policies/modules/condition-template-node-editor.vue';

defineOptions({ name: 'TradePolicyFitWorkbenchPage' });

interface ReadinessCheck {
  key: keyof Pick<
    TradePolicyFitPreflightView,
    | 'contract_valid'
    | 'fee_model_present'
    | 'fit_window_contained'
    | 'full_l2_trajectory_present'
    | 'latency_profile_present'
    | 'pit_cutoff_valid'
    | 'profile_lineage_valid'
    | 'profile_quality_gate_available'
    | 'raw_trajectory_labels_present'
    | 'retention_runway_proven'
    | 'source_dataset_policy_fit'
    | 'source_dataset_ready'
    | 'source_slice_verified'
  >;
  label: string;
}

const { handleRequest } = useRequestHandler();
const { governed } = useGovernedAction();
const router = useRouter();

const currentStep = ref(0);
const profiles = ref<ResearchProfileArtifact[]>([]);
const factors = ref<FactorDefinitionView[]>([]);
const selectedProfileHash = ref('');
const pitCutoffInput = ref('');
const selectedCandidateId = ref('conditional-1');
const evaluationTrack = ref<ResearchEvaluationTrack>('semi_auto_candidate');
const preflight = ref<null | TradePolicyFitPreflightView>(null);
const fitJob = ref<null | ResearchJobView>(null);
const trialAttempts = ref<TradePolicyTrialAttemptView[]>([]);
const candidateList = ref<HTMLElement | null>(null);
const preflightStale = ref(true);
const idempotencyKey = ref(crypto.randomUUID());
let pollTimer: ReturnType<typeof setTimeout> | undefined;

const trialColumns = computed<TableColumnsType<TradePolicyTrialAttemptView>>(
  () => [
    {
      dataIndex: 'candidate_id',
      key: 'candidate_id',
      title: $t('page.research.tradePolicies.workbench.candidateId'),
    },
    {
      dataIndex: 'scope',
      key: 'scope',
      title: $t('page.research.tradePolicies.workbench.trialScope'),
    },
    {
      dataIndex: 'status',
      key: 'status',
      title: $t('page.research.tradePolicies.workbench.jobStatus'),
    },
    {
      dataIndex: 'failure_detail',
      key: 'failure_detail',
      title: $t('page.research.tradePolicies.workbench.failureDetail'),
    },
  ],
);

const stepItems = computed<StepItem[]>(() => [
  { title: $t('page.research.tradePolicies.workbench.steps.profile') },
  { title: $t('page.research.tradePolicies.workbench.steps.data') },
  { title: $t('page.research.tradePolicies.workbench.steps.method') },
  { title: $t('page.research.tradePolicies.workbench.steps.review') },
]);

const selectedProfile = computed(() =>
  profiles.value.find(
    (profile) => profile.profile_ref.content_hash === selectedProfileHash.value,
  ),
);

const selectedPitCutoff = computed(() => {
  const timestamp = Date.parse(pitCutoffInput.value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
});

const evaluationTrackOptions = computed(() => {
  const options = [
    {
      label: $t('page.research.tradePolicies.workbench.researchOnly'),
      value: 'research_only',
    },
  ];
  if (
    selectedProfile.value?.spec.activation_eligibility === 'semi_auto_candidate'
  ) {
    options.push({
      label: $t('page.research.tradePolicies.workbench.semiAutoCandidate'),
      value: 'semi_auto_candidate',
    });
  }
  return options;
});

const profileOptions = computed(() =>
  profiles.value.map((profile) => ({
    label: `${profile.profile_ref.id}@${profile.profile_ref.version}`,
    value: profile.profile_ref.content_hash,
  })),
);

const factorOptions = computed(() =>
  factors.value.map((factor) => ({
    definitionHash: factor.definition_hash,
    label: `${factor.name} · ${factor.factor_family}`,
    value: factor.factor_definition_id,
  })),
);

const readinessChecks = computed<ReadinessCheck[]>(() => [
  {
    key: 'contract_valid',
    label: $t('page.research.tradePolicies.fit.contractValid'),
  },
  {
    key: 'source_dataset_ready',
    label: $t('page.research.tradePolicies.fit.datasetReady'),
  },
  {
    key: 'source_dataset_policy_fit',
    label: $t('page.research.tradePolicies.fit.datasetPurpose'),
  },
  {
    key: 'profile_lineage_valid',
    label: $t('page.research.tradePolicies.workbench.profileLineage'),
  },
  {
    key: 'source_slice_verified',
    label: $t('page.research.tradePolicies.workbench.sourceSlice'),
  },
  {
    key: 'raw_trajectory_labels_present',
    label: $t('page.research.tradePolicies.workbench.trajectoryLabels'),
  },
  {
    key: 'fit_window_contained',
    label: $t('page.research.tradePolicies.workbench.fitWindowContained'),
  },
  {
    key: 'full_l2_trajectory_present',
    label: $t('page.research.tradePolicies.fit.fullL2'),
  },
  {
    key: 'fee_model_present',
    label: $t('page.research.tradePolicies.fit.fees'),
  },
  {
    key: 'latency_profile_present',
    label: $t('page.research.tradePolicies.fit.latencyProfile'),
  },
  {
    key: 'retention_runway_proven',
    label: $t('page.research.tradePolicies.workbench.retentionRunway'),
  },
  {
    key: 'profile_quality_gate_available',
    label: $t('page.research.tradePolicies.fit.profileQualityGate'),
  },
  {
    key: 'pit_cutoff_valid',
    label: $t('page.research.tradePolicies.fit.pitCutoff'),
  },
]);

const canEnqueue = computed(
  () =>
    !preflightStale.value &&
    preflight.value?.publishable_input === 'pass' &&
    candidateBlockers.value.length === 0,
);

const operationalEvidence = computed<TradePolicyOperationalEvidenceView[]>(() =>
  [
    preflight.value?.retention_evidence,
    preflight.value?.latency_evidence,
  ].filter(
    (evidence): evidence is TradePolicyOperationalEvidenceView =>
      evidence !== null && evidence !== undefined,
  ),
);

function defaultPrice(): TradePolicyConditionTemplateNodeV1 {
  return {
    comparison: 'at_or_above',
    kind: 'price',
    max_input_age_ms: 2000,
    threshold: '0.5',
  };
}

function defaultCandidate(
  candidateId: string,
  entryCondition: TradePolicyCandidateSpec['entry_condition'],
): TradePolicyCandidateSpec {
  const reasons: ExitReason[] = [
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
  return {
    candidate_id: candidateId,
    entry_condition: entryCondition,
    entry_execution: {
      fill_requirement: 'all_or_nothing',
      kind: 'aggressive',
      max_book_age_ms: 2000,
      max_slippage_bps: '100',
    },
    exit: {
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
      reason_execution: reasons.map((reason) => ({
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
    },
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

const candidateBlockers = computed(() => {
  const blockers: string[] = [];
  const ids = candidates.value.map((candidate) =>
    candidate.candidate_id.trim(),
  );
  if (candidates.value.length > 32) {
    blockers.push(
      $t('page.research.tradePolicies.workbench.blocker.candidateLimit'),
    );
  }
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
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

function profileMatches(
  left: ResearchProfileArtifact,
  right: ResearchProfileArtifact,
) {
  return left.profile_ref.content_hash === right.profile_ref.content_hash;
}

function invalidatePreflight() {
  preflightStale.value = true;
  idempotencyKey.value = crypto.randomUUID();
}

function collectSelection(): null | TradePolicyFitSelection {
  const profile = selectedProfile.value;
  const pitCutoff = selectedPitCutoff.value;
  if (!profile || !pitCutoff) {
    message.warning($t('page.research.tradePolicies.fit.incomplete'));
    return null;
  }
  return {
    pit_cutoff: pitCutoff,
    profile_ref: profile.profile_ref,
  };
}

async function runPreflight() {
  if (candidateBlockers.value.length > 0) return;
  const selection = collectSelection();
  if (!selection) return;
  const result = await handleRequest(() =>
    preflightTradePolicy({
      candidates: candidates.value,
      evaluation_track: evaluationTrack.value,
      selection,
    }),
  );
  if (result) {
    preflight.value = result;
    preflightStale.value = false;
  }
}

async function enqueueFit() {
  const selection = collectSelection();
  if (!selection || !preflight.value || !canEnqueue.value) return;
  const canonical = preflight.value.canonical_candidates;
  if (!canonical) return;
  const job = await governed(
    (context) =>
      fitTradePolicy(
        {
          candidates: canonical,
          evaluation_track: evaluationTrack.value,
          idempotency_key: idempotencyKey.value,
          reason: context.reason,
          selection,
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
    if (latest) {
      fitJob.value = latest;
      if (['cancelled', 'failed', 'succeeded'].includes(latest.status)) {
        const trials = await handleRequest(
          () => listTradePolicyFitTrials(jobId, { page: 1, size: 100 }),
          { silent: true },
        );
        trialAttempts.value = trials?.items ?? [];
      }
    }
    schedulePoll();
  }, 2000);
}

async function cancelFit() {
  const job = fitJob.value;
  if (!job || ['cancelled', 'failed', 'succeeded'].includes(job.status)) return;
  const accepted = await governed(
    (context) => cancelResearchJob(job.job_id, context),
    {
      danger: true,
      summary: $t('page.research.tradePolicies.workbench.cancelSummary'),
      title: $t('page.research.tradePolicies.workbench.cancelFit'),
    },
  );
  if (accepted) fitJob.value = accepted;
}

function addCandidate() {
  if (candidates.value.length >= 32) return;
  let ordinal = candidates.value.length;
  let id = `conditional-${ordinal}`;
  while (candidates.value.some((candidate) => candidate.candidate_id === id)) {
    ordinal += 1;
    id = `conditional-${ordinal}`;
  }
  candidates.value.push(
    defaultCandidate(id, {
      confirmation_ms: 2000,
      kind: 'conditional',
      max_observation_gap_ms: 1000,
      root: defaultPrice(),
    }),
  );
  selectedCandidateId.value = id;
}

function removeCandidate(id: string) {
  candidates.value = candidates.value.filter(
    (candidate) =>
      candidate.candidate_id !== id ||
      candidate.entry_condition.kind === 'immediate',
  );
  if (
    !candidates.value.some(
      (item) => item.candidate_id === selectedCandidateId.value,
    )
  ) {
    selectedCandidateId.value = 'immediate';
  }
}

function renameSelectedCandidate(nextId: string) {
  const selected = selectedCandidate.value;
  if (!selected || selected.entry_condition.kind === 'immediate') return;
  selected.candidate_id = nextId;
  selectedCandidateId.value = nextId;
}

function selectCandidateAt(index: number) {
  const candidate = candidates.value[index];
  if (!candidate) return false;
  selectedCandidateId.value = candidate.candidate_id;
  return true;
}

function handleCandidateKeydown(event: KeyboardEvent, index: number) {
  let target = index;
  if (event.key === 'Enter' || event.key === ' ') {
    selectCandidateAt(index);
    event.preventDefault();
    return;
  }
  switch (event.key) {
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
  if (!selectCandidateAt(target)) return;
  void nextTick(() => {
    candidateList.value
      ?.querySelectorAll<HTMLElement>('[role="option"]')
      .item(target)
      .focus();
  });
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

function previousStep() {
  currentStep.value = Math.max(0, currentStep.value - 1);
}

function nextStep() {
  if (currentStep.value === 0 && !selectedProfile.value) return;
  if (currentStep.value === 1 && !selectedPitCutoff.value) return;
  if (currentStep.value === 2 && candidateBlockers.value.length > 0) return;
  currentStep.value = Math.min(3, currentStep.value + 1);
}

function statusColor(status: TradePolicyPreflightCheckStatus) {
  return status === 'pass' ? 'success' : 'error';
}

async function loadCatalogs() {
  const [profileRows, factorPage] = await Promise.all([
    handleRequest(() => listTradePolicyProfiles(), { silent: true }),
    handleRequest(() => listFactors({ size: 200, status: 'published' }), {
      silent: true,
    }),
  ]);
  profiles.value = profileRows ?? [];
  factors.value = factorPage?.items ?? [];
  const weather = profiles.value.find(
    (profile) => profile.profile_ref.id === 'weather_forecast_24h',
  );
  const initial = weather ?? profiles.value[0];
  if (initial) {
    selectedProfileHash.value = initial.profile_ref.content_hash;
    pitCutoffInput.value = new Date().toISOString().slice(0, 16);
  }
}

watch(selectedProfile, (next, prior) => {
  if (next && (!prior || !profileMatches(next, prior))) {
    evaluationTrack.value =
      next.spec.activation_eligibility === 'semi_auto_candidate'
        ? 'semi_auto_candidate'
        : 'research_only';
    invalidatePreflight();
  }
});

watch([pitCutoffInput, evaluationTrack], invalidatePreflight);
watch(candidates, invalidatePreflight, { deep: true });

onBeforeUnmount(() => {
  if (pollTimer) clearTimeout(pollTimer);
});

void loadCatalogs();
</script>

<template>
  <Page :title="$t('page.research.tradePolicies.workbench.title')">
    <div class="workbench-shell">
      <Steps :current="currentStep" :items="stepItems" responsive />

      <section
        aria-live="polite"
        class="workbench-content"
        data-testid="trade-policy-fit-workbench"
      >
        <Card
          v-if="currentStep === 0"
          :title="$t('page.research.tradePolicies.workbench.profileAndTarget')"
        >
          <div class="field-grid">
            <label>
              <span>{{
                $t('page.research.tradePolicies.workbench.profile')
              }}</span>
              <Select
                v-model:value="selectedProfileHash"
                :options="profileOptions"
                option-filter-prop="label"
                show-search
              />
            </label>
            <label>
              <span>{{
                $t('page.research.tradePolicies.workbench.evaluationTrack')
              }}</span>
              <Select
                v-model:value="evaluationTrack"
                :options="evaluationTrackOptions"
              />
            </label>
          </div>

          <Descriptions
            v-if="selectedProfile"
            :column="1"
            bordered
            class="mt-4"
          >
            <DescriptionsItem
              :label="$t('page.research.tradePolicies.workbench.profileHash')"
            >
              <span class="mono">{{
                selectedProfile.profile_ref.content_hash
              }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.tradePolicies.workbench.fitSpan')"
            >
              {{ selectedProfile.spec.fit_span_days }}d
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.tradePolicies.workbench.horizon')"
            >
              {{ selectedProfile.spec.target_horizon_secs }}s
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.tradePolicies.workbench.decisionCadence')
              "
            >
              {{ selectedProfile.spec.decision_cadence_secs }}s
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.tradePolicies.workbench.cashBudget')"
            >
              <Space>
                <Tag
                  v-for="tier in selectedProfile.spec.allowed_cash_budget_tiers"
                  :key="tier"
                  color="blue"
                  data-testid="profile-cash-budget"
                >
                  {{ formatUsd(tier) }}
                </Tag>
              </Space>
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t(
                  'page.research.tradePolicies.workbench.activationEligibility',
                )
              "
            >
              <Tag>{{ selectedProfile.spec.activation_eligibility }}</Tag>
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card
          v-else-if="currentStep === 1"
          :title="$t('page.research.tradePolicies.workbench.dataPreparation')"
        >
          <label class="field-stack">
            <span>{{ $t('page.research.tradePolicies.fit.pitCutoff') }}</span>
            <Input
              v-model:value="pitCutoffInput"
              data-testid="policy-fit-pit-cutoff"
              type="datetime-local"
            />
          </label>
          <Alert
            class="mt-4"
            :message="
              $t('page.research.tradePolicies.workbench.serverFrozenSource')
            "
            show-icon
            type="info"
          />
          <Descriptions
            v-if="selectedPitCutoff"
            :column="1"
            bordered
            class="mt-4"
          >
            <DescriptionsItem
              :label="$t('page.research.tradePolicies.fit.pitCutoff')"
            >
              {{ formatDateTimeLocal(selectedPitCutoff) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.tradePolicies.fit.window')"
            >
              {{
                preflight?.fit_window_start
                  ? formatDateTimeLocal(preflight.fit_window_start)
                  : '—'
              }}
              →
              {{
                preflight?.fit_window_end
                  ? formatDateTimeLocal(preflight.fit_window_end)
                  : '—'
              }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.tradePolicies.workbench.sourcePlan')"
            >
              <Tag>{{ preflight?.readiness ?? '—' }}</Tag>
              <span v-if="preflight?.reusable_source_dataset_id" class="mono">
                {{ preflight.reusable_source_dataset_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.tradePolicies.workbench.sourceIdentity')
              "
            >
              <span class="mono">{{
                preflight?.source_slice_identity_hash ?? '—'
              }}</span>
            </DescriptionsItem>
          </Descriptions>
          <Button
            class="mt-4"
            data-testid="run-preflight"
            :disabled="!selectedPitCutoff"
            type="primary"
            @click="runPreflight"
          >
            {{ $t('page.research.tradePolicies.fit.preflight') }}
          </Button>
          <div v-if="preflight && !preflightStale" class="readiness-grid mt-4">
            <div
              v-for="check in readinessChecks"
              :key="check.key"
              class="readiness-row"
            >
              <span>{{ check.label }}</span>
              <Tag :color="statusColor(preflight[check.key])">
                {{ preflight[check.key] }}
              </Tag>
            </div>
          </div>
          <Descriptions
            v-if="preflight && !preflightStale"
            :column="1"
            bordered
            class="mt-4"
            size="small"
          >
            <DescriptionsItem
              :label="
                $t('page.research.tradePolicies.workbench.retentionRunway')
              "
            >
              {{
                $t(
                  'page.research.tradePolicies.workbench.retentionRunwayValue',
                  {
                    actual: preflight.retention_runway_days ?? '—',
                    required: preflight.required_raw_retention_days ?? '—',
                  },
                )
              }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.tradePolicies.workbench.estimatedTrials')
              "
            >
              {{
                $t(
                  'page.research.tradePolicies.workbench.estimatedTrialsValue',
                  {
                    candidates: preflight.estimated_candidate_trials,
                    folds: preflight.estimated_fold_evaluations,
                  },
                )
              }}
            </DescriptionsItem>
          </Descriptions>
          <section
            v-if="operationalEvidence.length > 0"
            class="evidence-grid mt-4"
            data-testid="operational-readiness-evidence"
          >
            <Card
              v-for="evidence in operationalEvidence"
              :key="evidence.evidence_id"
              size="small"
              :title="evidence.kind"
            >
              <Descriptions :column="1" size="small">
                <DescriptionsItem
                  :label="
                    $t('page.research.tradePolicies.workbench.evidenceId')
                  "
                >
                  <span class="mono">{{ evidence.evidence_id }}</span>
                </DescriptionsItem>
                <DescriptionsItem
                  :label="
                    $t('page.research.tradePolicies.workbench.evidenceHash')
                  "
                >
                  <span class="mono">{{ evidence.payload_hash }}</span>
                </DescriptionsItem>
                <DescriptionsItem
                  :label="
                    $t('page.research.tradePolicies.workbench.objectVersion')
                  "
                >
                  <span class="mono">{{ evidence.artifact_version }}</span>
                </DescriptionsItem>
                <DescriptionsItem
                  :label="
                    $t('page.research.tradePolicies.workbench.attestationKey')
                  "
                >
                  <span class="mono">{{ evidence.attestation_key_id }}</span>
                </DescriptionsItem>
                <DescriptionsItem
                  :label="
                    $t('page.research.tradePolicies.workbench.observedAt')
                  "
                >
                  {{ formatDateTimeLocal(evidence.observed_at) }}
                </DescriptionsItem>
                <DescriptionsItem
                  :label="$t('page.research.tradePolicies.workbench.expiresAt')"
                >
                  {{ formatDateTimeLocal(evidence.expires_at) }}
                </DescriptionsItem>
              </Descriptions>
            </Card>
          </section>
        </Card>

        <Card
          v-else-if="currentStep === 2"
          :title="
            $t('page.research.tradePolicies.workbench.methodAndCandidates')
          "
        >
          <div class="method-grid">
            <aside>
              <Alert
                :message="
                  $t('page.research.tradePolicies.workbench.immediateFixed')
                "
                show-icon
                type="info"
              />
              <div
                ref="candidateList"
                :aria-label="
                  $t('page.research.tradePolicies.workbench.candidates')
                "
                class="candidate-list"
                role="listbox"
              >
                <div
                  v-for="(candidate, index) in candidates"
                  :key="candidate.candidate_id"
                  class="candidate-row"
                  :class="{
                    selected: candidate.candidate_id === selectedCandidateId,
                  }"
                >
                  <button
                    :aria-selected="
                      candidate.candidate_id === selectedCandidateId
                    "
                    class="candidate-select"
                    role="option"
                    :tabindex="
                      candidate.candidate_id === selectedCandidateId ? 0 : -1
                    "
                    type="button"
                    @click="selectedCandidateId = candidate.candidate_id"
                    @keydown="handleCandidateKeydown($event, index)"
                  >
                    <strong>{{ candidate.candidate_id }}</strong>
                    <Tag>{{ candidate.entry_condition.kind }}</Tag>
                  </button>
                  <Button
                    v-if="candidate.entry_condition.kind !== 'immediate'"
                    danger
                    size="small"
                    @click="removeCandidate(candidate.candidate_id)"
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
            </aside>

            <div v-if="selectedCandidate" class="candidate-editor">
              <Empty
                v-if="selectedCandidate.entry_condition.kind === 'immediate'"
              />
              <template v-else>
                <div class="field-grid">
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
                      :min="1"
                    />
                  </label>
                </div>
                <ConditionTemplateNodeEditor
                  v-model="selectedCandidate.entry_condition.root"
                  :factor-options="factorOptions"
                  class="mt-4"
                />
              </template>

              <div class="field-grid mt-4">
                <label>
                  <span>{{
                    $t('page.research.tradePolicies.workbench.orderKind')
                  }}</span>
                  <Select
                    :options="[
                      { label: 'Aggressive FOK/FAK', value: 'aggressive' },
                      {
                        label: 'Passive post-only',
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
                <label
                  v-if="selectedCandidate.entry_execution.kind === 'aggressive'"
                >
                  <span>{{
                    $t('page.research.tradePolicies.workbench.maxSlippage')
                  }}</span>
                  <Input
                    v-model:value="
                      selectedCandidate.entry_execution.max_slippage_bps
                    "
                  />
                </label>
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
              </div>
            </div>
          </div>

          <Alert
            v-for="blocker in candidateBlockers"
            :key="blocker"
            class="mt-3"
            :message="blocker"
            show-icon
            type="error"
          />
        </Card>

        <Card
          v-else
          :title="$t('page.research.tradePolicies.workbench.reviewAndEnqueue')"
        >
          <Alert
            :message="
              canEnqueue
                ? $t('page.research.tradePolicies.fit.publishable')
                : $t('page.research.tradePolicies.fit.blocked')
            "
            show-icon
            :type="canEnqueue ? 'success' : 'warning'"
          />
          <Descriptions :column="1" bordered class="mt-4">
            <DescriptionsItem
              :label="$t('page.research.tradePolicies.workbench.profile')"
            >
              {{ selectedProfile?.profile_ref.id }}@{{
                selectedProfile?.profile_ref.version
              }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.tradePolicies.workbench.evaluationTrack')
              "
            >
              {{ evaluationTrack }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.tradePolicies.fit.dataset')"
            >
              <span class="mono">{{
                preflight?.reusable_source_dataset_id ??
                $t('page.research.tradePolicies.workbench.materializeOnSubmit')
              }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.tradePolicies.workbench.candidateHash')"
            >
              <span class="mono">{{
                preflight?.candidate_set_hash ?? '—'
              }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.tradePolicies.fit.methodologyHash')"
            >
              <span class="mono">{{ preflight?.methodology_hash ?? '—' }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.tradePolicies.workbench.programHash')"
            >
              <span class="mono">{{
                preflight?.research_program_hash ?? '—'
              }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.tradePolicies.workbench.sourceIdentity')
              "
            >
              <span class="mono">{{
                preflight?.source_slice_identity_hash ?? '—'
              }}</span>
            </DescriptionsItem>
          </Descriptions>

          <div class="review-actions mt-4">
            <Button @click="runPreflight">
              {{ $t('page.research.tradePolicies.fit.preflight') }}
            </Button>
            <Button
              data-testid="enqueue-fit"
              :disabled="!canEnqueue"
              type="primary"
              @click="enqueueFit"
            >
              {{ $t('page.research.tradePolicies.fit.enqueue') }}
            </Button>
          </div>

          <div
            v-if="preflight?.blockers.length"
            class="mt-4"
            data-testid="preflight-blockers"
            role="status"
          >
            <Alert
              v-for="item in preflight.blockers"
              :key="item.kind"
              class="mb-2"
              data-testid="preflight-blocker"
              type="warning"
              show-icon
            >
              <template #message>
                {{
                  $t(
                    `page.research.tradePolicies.preflightBlocker.${item.kind}`,
                  )
                }}
              </template>
              <template #description>
                <div class="blocker-detail">
                  <span>
                    <strong>
                      {{ $t('page.research.tradePolicies.workbench.actual') }}:
                    </strong>
                    {{ JSON.stringify(item.actual) }}
                  </span>
                  <span>
                    <strong>
                      {{
                        $t('page.research.tradePolicies.workbench.required')
                      }}:
                    </strong>
                    {{ JSON.stringify(item.required) }}
                  </span>
                  <span>{{ item.remediation }}</span>
                  <a v-if="item.evidence_link" :href="item.evidence_link">
                    {{ $t('page.research.tradePolicies.workbench.evidence') }}
                  </a>
                </div>
              </template>
            </Alert>
          </div>

          <details class="canonical mt-4">
            <summary>
              {{ $t('page.research.tradePolicies.workbench.canonicalJson') }}
            </summary>
            <pre>{{ canonicalPreview }}</pre>
          </details>

          <Card
            v-if="fitJob"
            class="mt-4"
            :title="$t('page.research.tradePolicies.workbench.result')"
          >
            <Descriptions :column="1" size="small">
              <DescriptionsItem
                :label="$t('page.research.tradePolicies.workbench.jobId')"
              >
                <span class="mono">{{ fitJob.job_id }}</span>
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.tradePolicies.workbench.jobStatus')"
              >
                <Tag>{{ fitJob.status }}</Tag>
              </DescriptionsItem>
              <DescriptionsItem
                v-if="fitJob.progress"
                :label="$t('page.research.tradePolicies.workbench.jobPhase')"
              >
                <Space>
                  <Tag color="blue">{{ fitJob.progress.phase }}</Tag>
                  <span>
                    {{ fitJob.progress.processed }} /
                    {{ fitJob.progress.total ?? '—' }}
                  </span>
                </Space>
              </DescriptionsItem>
            </Descriptions>
            <Space class="mt-3">
              <Button
                @click="router.push(`/research/jobs?open=${fitJob.job_id}`)"
              >
                {{ $t('page.research.tradePolicies.workbench.openJob') }}
              </Button>
              <Button
                v-if="
                  !['cancelled', 'failed', 'succeeded'].includes(fitJob.status)
                "
                danger
                @click="cancelFit"
              >
                {{ $t('page.research.tradePolicies.workbench.cancelFit') }}
              </Button>
            </Space>
            <div v-if="trialAttempts.length > 0" class="mt-4">
              <h4>
                {{ $t('page.research.tradePolicies.workbench.trialLedger') }}
              </h4>
              <Table
                :columns="trialColumns"
                :data-source="trialAttempts"
                :pagination="false"
                :row-key="(row) => row.trial_attempt_id"
                size="small"
              />
            </div>
          </Card>
        </Card>
      </section>

      <footer class="step-actions">
        <Button :disabled="currentStep === 0" @click="previousStep">
          {{ $t('common.back') }}
        </Button>
        <Button
          v-if="currentStep < 3"
          data-testid="workbench-next"
          type="primary"
          @click="nextStep"
        >
          {{ $t('page.research.tradePolicies.workbench.next') }}
        </Button>
      </footer>
    </div>
  </Page>
</template>

<style scoped>
.workbench-shell {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}

.workbench-content {
  min-width: 0;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.field-grid label,
.field-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.method-grid {
  display: grid;
  grid-template-columns: minmax(240px, 0.35fr) minmax(0, 1fr);
  gap: 20px;
}

.candidate-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.candidate-row {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.candidate-row.selected {
  border-color: var(--primary);
}

.candidate-select {
  display: flex;
  flex: 1;
  gap: 8px;
  align-items: center;
  min-width: 0;
  padding: 6px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.readiness-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border: 1px solid var(--border);
  border-radius: 8px;
}

.evidence-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.readiness-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.review-actions,
.step-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.canonical pre {
  max-height: 360px;
  overflow: auto;
  white-space: pre-wrap;
}

.blocker-detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  overflow-wrap: anywhere;
}

@media (max-width: 900px) {
  .field-grid,
  .evidence-grid,
  .method-grid,
  .readiness-grid {
    grid-template-columns: 1fr;
  }
}
</style>
