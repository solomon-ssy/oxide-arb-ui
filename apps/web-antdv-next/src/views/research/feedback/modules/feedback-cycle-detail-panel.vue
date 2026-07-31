<script lang="ts" setup>
import type {
  DatasetCohortCounts,
  FeedbackCycleDetailView,
  FeedbackDriftAssessment,
  FeedbackStageEventKind,
} from '@vben/types';

import type { FeedbackCycleOutcomeState } from './feedback-cycle-detail-state';

import { computed } from 'vue';

import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import {
  Alert,
  Card,
  Collapse,
  CollapsePanel,
  Descriptions,
  DescriptionsItem,
  Empty,
  Tag,
} from 'antdv-next';

import { $t } from '#/locales';
import {
  formatBps,
  formatDateTimeLocal,
  formatPercent,
} from '#/shared/components/format';

import { gateStatusColor } from '../../shared/quality-gate';
import { feedbackCycleOutcomeState } from './feedback-cycle-detail-state';

const props = defineProps<{
  detail: FeedbackCycleDetailView;
}>();

const outcome = computed(() => feedbackCycleOutcomeState(props.detail.cycle));
const candidateReady = computed(() => props.detail.candidate_ready);
const usesWideDescriptionLayout =
  useBreakpoints(breakpointsTailwind).greaterOrEqual('md');
const descriptionColumn = computed(() =>
  usesWideDescriptionLayout.value ? 2 : 1,
);

const cohorts = computed(() => {
  const coverage = props.detail.coverage;
  if (coverage === null) {
    return [];
  }
  return [
    {
      counts: coverage.model_learning,
      key: 'modelLearning',
    },
    {
      counts: coverage.execution_learning,
      key: 'executionLearning',
    },
    {
      counts: coverage.policy_evaluation,
      key: 'policyEvaluation',
    },
  ] satisfies Array<{
    counts: DatasetCohortCounts;
    key: 'executionLearning' | 'modelLearning' | 'policyEvaluation';
  }>;
});

function outcomeColor(value: FeedbackCycleOutcomeState) {
  switch (value) {
    case 'cancelled':
    case 'failed': {
      return 'error';
    }
    case 'candidate_ready': {
      return 'processing';
    }
    case 'challenger_rejected':
    case 'no_action': {
      return 'default';
    }
    case 'pending': {
      return 'warning';
    }
    case 'promoted': {
      return 'success';
    }
  }
}

function outcomeLabel(value: FeedbackCycleOutcomeState) {
  switch (value) {
    case 'cancelled':
    case 'failed': {
      return $t(`page.research.feedback.status.${value}`);
    }
    case 'pending': {
      return $t('page.research.feedback.detail.outcome.pending');
    }
    default: {
      return $t(`page.research.feedback.decision.${value}`);
    }
  }
}

function eventColor(kind: FeedbackStageEventKind) {
  switch (kind) {
    case 'cancellation_requested':
    case 'lease_recovered': {
      return 'warning';
    }
    case 'cancelled':
    case 'failed': {
      return 'error';
    }
    case 'job_linked':
    case 'triggered': {
      return 'default';
    }
    case 'started': {
      return 'processing';
    }
    case 'succeeded': {
      return 'success';
    }
  }
}

function driftColor(assessment: FeedbackDriftAssessment) {
  switch (assessment) {
    case 'insufficient_evidence': {
      return 'warning';
    }
    case 'threshold_exceeded': {
      return 'error';
    }
    case 'within_threshold': {
      return 'success';
    }
  }
}

function gateStatusLabel(status: string) {
  return $t(
    `page.research.feedback.detail.candidateReady.gateStatus.${status}`,
  );
}
</script>

<template>
  <section
    :aria-labelledby="`feedback-cycle-detail-${detail.cycle.feedback_cycle_id}`"
    class="min-w-0 space-y-4"
  >
    <Card v-if="candidateReady" class="min-w-0" size="small">
      <template #title>
        <h2 class="text-base font-semibold">
          {{ $t('page.research.feedback.detail.candidateReady.title') }}
        </h2>
      </template>
      <template #extra>
        <Tag color="success">
          {{ $t('page.research.feedback.detail.candidateReady.ready') }}
        </Tag>
      </template>

      <Alert
        :description="
          $t('page.research.feedback.detail.candidateReady.description')
        "
        :message="$t('page.research.feedback.detail.candidateReady.noBlockers')"
        class="mb-4"
        show-icon
        type="success"
      />

      <div class="grid min-w-0 gap-4 xl:grid-cols-2">
        <section class="min-w-0 rounded-md border p-3">
          <h3 class="mb-3 text-sm font-semibold">
            {{ $t('page.research.feedback.detail.candidateReady.route.title') }}
          </h3>
          <Descriptions :column="1" size="small">
            <DescriptionsItem
              :label="
                $t('page.research.feedback.detail.candidateReady.route.models')
              "
            >
              <span class="break-all font-mono text-xs">
                {{ candidateReady.route_diff.champion_model_version_id }}
              </span>
              <span aria-hidden="true" class="mx-2">→</span>
              <span class="break-all font-mono text-xs">
                {{ candidateReady.route_diff.candidate_model_version_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t(
                  'page.research.feedback.detail.candidateReady.route.generation',
                )
              "
            >
              <span class="font-mono tabular-nums">
                {{ candidateReady.route_diff.current_route_generation }}
                →
                {{ candidateReady.route_diff.proposed_route_generation }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t(
                  'page.research.feedback.detail.candidateReady.route.authority',
                )
              "
            >
              <Tag color="success">
                {{
                  $t(
                    'page.research.feedback.detail.candidateReady.route.unchanged',
                  )
                }}
              </Tag>
            </DescriptionsItem>
          </Descriptions>
        </section>

        <section class="min-w-0 rounded-md border p-3">
          <h3 class="mb-3 text-sm font-semibold">
            {{
              $t(
                'page.research.feedback.detail.candidateReady.comparison.title',
              )
            }}
          </h3>
          <Descriptions :column="1" size="small">
            <DescriptionsItem
              :label="
                $t(
                  'page.research.feedback.detail.candidateReady.comparison.observations',
                )
              "
            >
              <span class="font-mono tabular-nums">
                {{ candidateReady.comparison.observation_count }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t(
                  'page.research.feedback.detail.candidateReady.comparison.effect',
                )
              "
            >
              {{ formatBps(candidateReady.comparison.effect_bps) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t(
                  'page.research.feedback.detail.candidateReady.comparison.lowerBound',
                )
              "
            >
              {{
                formatBps(
                  candidateReady.comparison.simultaneous_lower_bound_bps,
                )
              }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t(
                  'page.research.feedback.detail.candidateReady.comparison.adjustedP',
                )
              "
            >
              <span class="font-mono tabular-nums">
                {{ candidateReady.comparison.adjusted_p_value }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t(
                  'page.research.feedback.detail.candidateReady.comparison.confidence',
                )
              "
            >
              {{ formatPercent(candidateReady.comparison.confidence) }}
            </DescriptionsItem>
          </Descriptions>
        </section>

        <section class="min-w-0 rounded-md border p-3">
          <h3 class="mb-3 text-sm font-semibold">
            {{
              $t('page.research.feedback.detail.candidateReady.shadow.title')
            }}
          </h3>
          <Descriptions :column="1" size="small">
            <DescriptionsItem
              :label="
                $t(
                  'page.research.feedback.detail.candidateReady.shadow.observations',
                )
              "
            >
              {{ candidateReady.shadow.observed }} /
              {{ candidateReady.shadow.required }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.feedback.detail.candidateReady.shadow.window')
              "
            >
              {{ candidateReady.shadow.observed_window_secs }} /
              {{ candidateReady.shadow.required_window_secs }}
              {{ $t('page.research.feedback.detail.candidateReady.seconds') }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t(
                  'page.research.feedback.detail.candidateReady.shadow.overlap',
                )
              "
            >
              {{ formatPercent(candidateReady.shadow.mean_topn_overlap) }} /
              {{ formatPercent(candidateReady.shadow.minimum_topn_overlap) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t(
                  'page.research.feedback.detail.candidateReady.shadow.divergence',
                )
              "
            >
              <Tag
                :color="
                  candidateReady.shadow.any_hard_divergence
                    ? 'error'
                    : 'success'
                "
              >
                {{
                  candidateReady.shadow.any_hard_divergence
                    ? $t(
                        'page.research.feedback.detail.candidateReady.shadow.detected',
                      )
                    : $t(
                        'page.research.feedback.detail.candidateReady.shadow.none',
                      )
                }}
              </Tag>
            </DescriptionsItem>
          </Descriptions>
        </section>

        <section class="min-w-0 rounded-md border p-3">
          <h3 class="mb-3 text-sm font-semibold">
            {{
              $t(
                'page.research.feedback.detail.candidateReady.attribution.title',
              )
            }}
          </h3>
          <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt class="text-muted-foreground">
                {{
                  $t(
                    'page.research.feedback.detail.candidateReady.attribution.priorUses',
                  )
                }}
              </dt>
              <dd class="font-mono tabular-nums">
                {{ candidateReady.attribution.prior_cycle_use_count }}
              </dd>
            </div>
            <div>
              <dt class="text-muted-foreground">
                {{
                  $t(
                    'page.research.feedback.detail.candidateReady.attribution.explanations',
                  )
                }}
              </dt>
              <dd class="font-mono tabular-nums">
                {{ candidateReady.attribution.prediction_explanation_count }}
              </dd>
            </div>
            <div>
              <dt class="text-muted-foreground">
                {{
                  $t(
                    'page.research.feedback.detail.candidateReady.attribution.counterfactuals',
                  )
                }}
              </dt>
              <dd class="font-mono tabular-nums">
                {{ candidateReady.attribution.decision_counterfactual_count }}
              </dd>
            </div>
            <div>
              <dt class="text-muted-foreground">
                {{
                  $t(
                    'page.research.feedback.detail.candidateReady.attribution.associations',
                  )
                }}
              </dt>
              <dd class="font-mono tabular-nums">
                {{ candidateReady.attribution.outcome_association_count }}
              </dd>
            </div>
            <div>
              <dt class="text-muted-foreground">
                {{
                  $t(
                    'page.research.feedback.detail.candidateReady.attribution.trajectories',
                  )
                }}
              </dt>
              <dd class="font-mono tabular-nums">
                {{ candidateReady.attribution.execution_trajectory_count }}
              </dd>
            </div>
            <div>
              <dt class="text-muted-foreground">
                {{
                  $t(
                    'page.research.feedback.detail.candidateReady.attribution.policyOutcomes',
                  )
                }}
              </dt>
              <dd class="font-mono tabular-nums">
                {{ candidateReady.attribution.policy_counterfactual_count }}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section class="mt-4 min-w-0 rounded-md border p-3">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-sm font-semibold">
            {{
              $t(
                'page.research.feedback.detail.candidateReady.qualityGate.title',
              )
            }}
          </h3>
          <Tag color="success">
            {{
              $t(
                'page.research.feedback.detail.candidateReady.qualityGate.passed',
              )
            }}
          </Tag>
        </div>
        <div class="grid min-w-0 gap-2 lg:grid-cols-2">
          <article
            v-for="gate in candidateReady.quality_gate.gates"
            :key="gate.gate"
            class="min-w-0 rounded border p-2"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <span class="break-all font-mono text-xs">{{ gate.gate }}</span>
              <Tag :color="gateStatusColor(gate.status)">
                {{ gateStatusLabel(gate.status) }}
              </Tag>
            </div>
            <dl class="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt class="text-muted-foreground">
                  {{
                    $t(
                      'page.research.feedback.detail.candidateReady.qualityGate.observed',
                    )
                  }}
                </dt>
                <dd class="break-all font-mono">{{ gate.observed }}</dd>
              </div>
              <div>
                <dt class="text-muted-foreground">
                  {{
                    $t(
                      'page.research.feedback.detail.candidateReady.qualityGate.threshold',
                    )
                  }}
                </dt>
                <dd class="break-all font-mono">{{ gate.threshold }}</dd>
              </div>
            </dl>
            <p v-if="gate.detail" class="mt-2 text-xs text-muted-foreground">
              {{ gate.detail }}
            </p>
          </article>
        </div>
      </section>

      <Collapse class="mt-4" ghost>
        <CollapsePanel
          key="candidate-ready-evidence"
          :header="
            $t('page.research.feedback.detail.candidateReady.evidence.title')
          "
        >
          <Descriptions :column="1" size="small">
            <DescriptionsItem
              :label="
                $t(
                  'page.research.feedback.detail.candidateReady.evidence.qualityHash',
                )
              "
            >
              <span class="break-all font-mono text-xs">
                {{ candidateReady.quality_gate.report_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t(
                  'page.research.feedback.detail.candidateReady.evidence.useSetHash',
                )
              "
            >
              <span class="break-all font-mono text-xs">
                {{ candidateReady.attribution.use_set_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t(
                  'page.research.feedback.detail.candidateReady.evidence.producedSetHash',
                )
              "
            >
              <span class="break-all font-mono text-xs">
                {{ candidateReady.attribution.produced_set_hash }}
              </span>
            </DescriptionsItem>
          </Descriptions>
        </CollapsePanel>
      </Collapse>
    </Card>

    <Card class="min-w-0" size="small">
      <template #title>
        <h2
          :id="`feedback-cycle-detail-${detail.cycle.feedback_cycle_id}`"
          class="text-base font-semibold"
        >
          {{ $t('page.research.feedback.detail.audit.title') }}
        </h2>
      </template>
      <template #extra>
        <Tag :color="outcomeColor(outcome)">
          {{ outcomeLabel(outcome) }}
        </Tag>
      </template>

      <Descriptions
        :key="`audit-${detail.cycle.feedback_cycle_id}-${descriptionColumn}`"
        :column="descriptionColumn"
        bordered
        size="small"
      >
        <DescriptionsItem
          :label="$t('page.research.feedback.detail.audit.cycleId')"
          span="filled"
        >
          <span class="break-all font-mono text-xs">
            {{ detail.cycle.feedback_cycle_id }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.detail.audit.profile')"
        >
          <span class="break-all font-mono text-xs">
            {{ detail.cycle.research_profile_artifact_id }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.detail.audit.capabilityHashes')"
        >
          <ul class="min-w-0 space-y-1">
            <li
              v-for="hash in detail.cycle.capability_registry_hashes"
              :key="hash"
              class="break-all font-mono text-xs"
            >
              {{ hash }}
            </li>
          </ul>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.detail.audit.trigger')"
        >
          <ul class="space-y-1">
            <li
              v-for="trigger in detail.triggers"
              :key="trigger.feedback_trigger_event_id"
            >
              {{
                $t(`page.research.feedback.trigger.${trigger.trigger_family}`)
              }}
            </li>
          </ul>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.detail.audit.generation')"
        >
          <span class="font-mono tabular-nums">
            {{ detail.cycle.generation }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.detail.audit.labelCutoff')"
        >
          {{ formatDateTimeLocal(detail.cycle.label_cutoff) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.detail.audit.championModel')"
        >
          <span class="break-all font-mono text-xs">
            {{ detail.cycle.champion_model_version_id }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.detail.audit.championHash')"
        >
          <span class="break-all font-mono text-xs">
            {{ detail.cycle.champion_serving_contract_hash }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.detail.audit.policyHash')"
        >
          <span class="break-all font-mono text-xs">
            {{ detail.cycle.feedback_policy_hash }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.detail.audit.familyHash')"
        >
          <span class="break-all font-mono text-xs">
            {{ detail.cycle.candidate_family_hash }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.detail.audit.idempotencyHash')"
        >
          <span class="break-all font-mono text-xs">
            {{ detail.cycle.idempotency_hash }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.detail.audit.terminalReason')"
        >
          <span class="break-all font-mono text-xs">
            {{
              detail.cycle.terminal_reason_code ??
              $t('page.research.feedback.detail.notObserved')
            }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.detail.audit.startedAt')"
        >
          {{
            detail.cycle.started_at
              ? formatDateTimeLocal(detail.cycle.started_at)
              : $t('page.research.feedback.detail.notObserved')
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.detail.audit.completedAt')"
        >
          {{
            detail.cycle.completed_at
              ? formatDateTimeLocal(detail.cycle.completed_at)
              : $t('page.research.feedback.detail.notObserved')
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.detail.audit.leaseExpiresAt')"
        >
          {{
            detail.cycle.lease_expires_at
              ? formatDateTimeLocal(detail.cycle.lease_expires_at)
              : $t('page.research.feedback.detail.notObserved')
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.detail.audit.cancelRequestedAt')"
        >
          {{
            detail.cycle.cancel_requested_at
              ? formatDateTimeLocal(detail.cycle.cancel_requested_at)
              : $t('page.research.feedback.detail.notObserved')
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.detail.audit.createdAt')"
        >
          {{ formatDateTimeLocal(detail.cycle.created_at) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.detail.audit.updatedAt')"
        >
          {{ formatDateTimeLocal(detail.cycle.updated_at) }}
        </DescriptionsItem>
      </Descriptions>
    </Card>

    <Card class="min-w-0" size="small">
      <template #title>
        <h3 class="text-sm font-semibold">
          {{ $t('page.research.feedback.detail.timeline.title') }}
        </h3>
      </template>

      <Empty
        v-if="detail.timeline.length === 0"
        :description="$t('page.research.feedback.detail.timeline.empty')"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />
      <ol
        v-else
        :aria-label="$t('page.research.feedback.detail.timeline.aria')"
        class="space-y-3"
      >
        <li
          v-for="event in detail.timeline"
          :key="event.feedback_stage_event_id"
          class="min-w-0 rounded-md border p-3"
        >
          <div
            class="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
          >
            <div class="min-w-0">
              <p class="font-medium">
                <span class="mr-2 font-mono tabular-nums">
                  #{{ event.event_sequence }}
                </span>
                {{
                  $t(
                    `page.research.feedback.detail.timeline.stage.${event.stage}`,
                  )
                }}
              </p>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ formatDateTimeLocal(event.occurred_at) }}
              </p>
            </div>
            <Tag :color="eventColor(event.event_kind)">
              {{
                $t(
                  `page.research.feedback.detail.timeline.event.${event.event_kind}`,
                )
              }}
            </Tag>
          </div>

          <dl class="mt-3 grid min-w-0 gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
            <div class="min-w-0">
              <dt class="text-muted-foreground">
                {{ $t('page.research.feedback.detail.timeline.eventId') }}
              </dt>
              <dd class="break-all font-mono">
                {{ event.feedback_stage_event_id }}
              </dd>
            </div>
            <div class="min-w-0">
              <dt class="text-muted-foreground">
                {{ $t('page.research.feedback.detail.timeline.actor') }}
              </dt>
              <dd class="break-all font-mono">
                {{
                  event.actor ?? $t('page.research.feedback.detail.notObserved')
                }}
              </dd>
            </div>
            <div class="min-w-0">
              <dt class="text-muted-foreground">
                {{ $t('page.research.feedback.detail.timeline.jobId') }}
              </dt>
              <dd class="break-all font-mono">
                {{
                  event.research_job_id ??
                  $t('page.research.feedback.detail.notObserved')
                }}
              </dd>
            </div>
            <div class="min-w-0">
              <dt class="text-muted-foreground">
                {{ $t('page.research.feedback.detail.timeline.reason') }}
              </dt>
              <dd class="break-all font-mono">
                {{
                  event.reason_code ??
                  $t('page.research.feedback.detail.notObserved')
                }}
              </dd>
            </div>
            <div class="min-w-0">
              <dt class="text-muted-foreground">
                {{ $t('page.research.feedback.detail.timeline.eventHash') }}
              </dt>
              <dd class="break-all font-mono">{{ event.event_hash }}</dd>
            </div>
            <div class="min-w-0">
              <dt class="text-muted-foreground">
                {{ $t('page.research.feedback.detail.timeline.evidenceUri') }}
              </dt>
              <dd class="break-all font-mono">
                {{
                  event.evidence_uri ??
                  $t('page.research.feedback.detail.notObserved')
                }}
              </dd>
            </div>
            <div class="min-w-0">
              <dt class="text-muted-foreground">
                {{ $t('page.research.feedback.detail.timeline.evidenceHash') }}
              </dt>
              <dd class="break-all font-mono">
                {{
                  event.evidence_hash ??
                  $t('page.research.feedback.detail.notObserved')
                }}
              </dd>
            </div>
            <div class="min-w-0">
              <dt class="text-muted-foreground">
                {{ $t('page.research.feedback.detail.timeline.createdAt') }}
              </dt>
              <dd>{{ formatDateTimeLocal(event.created_at) }}</dd>
            </div>
          </dl>
        </li>
      </ol>
    </Card>

    <Card class="min-w-0" size="small">
      <template #title>
        <h3 class="text-sm font-semibold">
          {{ $t('page.research.feedback.detail.coverage.title') }}
        </h3>
      </template>

      <Empty
        v-if="detail.coverage === null"
        :description="$t('page.research.feedback.detail.coverage.empty')"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />
      <template v-else>
        <Descriptions
          :key="`coverage-${detail.cycle.feedback_cycle_id}-${descriptionColumn}`"
          :column="descriptionColumn"
          bordered
          size="small"
        >
          <DescriptionsItem
            :label="$t('page.research.feedback.detail.coverage.decision')"
          >
            {{
              $t(
                `page.research.feedback.profile.coverage.state.${detail.coverage.decision}`,
              )
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.detail.coverage.reason')"
          >
            <span class="break-all font-mono text-xs">
              {{
                detail.coverage.reason_code ??
                $t('page.research.feedback.detail.notObserved')
              }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.detail.coverage.ratio')"
          >
            <span class="font-mono tabular-nums">
              {{ detail.coverage.coverage }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.detail.coverage.minimum')"
          >
            <span class="font-mono tabular-nums">
              {{ detail.coverage.minimum_coverage }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.detail.coverage.labels')"
          >
            {{ detail.coverage.mature_label_count }} /
            {{ detail.coverage.minimum_mature_labels }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.detail.coverage.newLabels')"
          >
            {{ detail.coverage.new_mature_label_count }} /
            {{ detail.coverage.minimum_new_mature_labels }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t('page.research.feedback.detail.coverage.policyEvaluations')
            "
          >
            <span class="font-mono tabular-nums">
              {{ detail.coverage.policy_evaluation_count }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.detail.coverage.window')"
          >
            {{ formatDateTimeLocal(detail.coverage.evaluation_window_start) }}
            →
            {{ formatDateTimeLocal(detail.coverage.label_cutoff) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.detail.coverage.artifactId')"
          >
            <span class="break-all font-mono text-xs">
              {{ detail.coverage.artifact_id }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.detail.coverage.artifactUri')"
          >
            <span class="break-all font-mono text-xs">
              {{ detail.coverage.artifact_uri }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.detail.coverage.artifactHash')"
          >
            <span class="break-all font-mono text-xs">
              {{ detail.coverage.artifact_hash }}
            </span>
          </DescriptionsItem>
        </Descriptions>

        <div class="mt-4 grid min-w-0 gap-3 xl:grid-cols-3">
          <article
            v-for="cohort in cohorts"
            :key="cohort.key"
            class="min-w-0 rounded-md border p-3"
          >
            <h4 class="text-sm font-medium">
              {{ $t(`page.research.feedback.detail.coverage.${cohort.key}`) }}
            </h4>
            <dl class="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <dt class="text-xs text-muted-foreground">
                  {{ $t('page.research.feedback.detail.coverage.candidate') }}
                </dt>
                <dd class="font-mono tabular-nums">
                  {{ cohort.counts.candidate_count }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground">
                  {{ $t('page.research.feedback.detail.coverage.eligible') }}
                </dt>
                <dd class="font-mono tabular-nums">
                  {{ cohort.counts.eligible_count }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground">
                  {{ $t('page.research.feedback.detail.coverage.included') }}
                </dt>
                <dd class="font-mono tabular-nums">
                  {{ cohort.counts.included_count }}
                </dd>
              </div>
            </dl>

            <div
              v-if="
                cohort.counts.exclusion_counts.length > 0 ||
                cohort.counts.censor_counts.length > 0
              "
              class="mt-3 border-t pt-3 text-xs"
            >
              <p
                v-for="entry in cohort.counts.exclusion_counts"
                :key="`exclusion:${entry.reason}`"
                class="flex min-w-0 justify-between gap-2"
              >
                <span class="min-w-0 break-all font-mono">
                  {{ entry.reason }}
                </span>
                <span class="shrink-0 font-mono tabular-nums">
                  {{ entry.count }}
                </span>
              </p>
              <p
                v-for="entry in cohort.counts.censor_counts"
                :key="`censor:${entry.reason}`"
                class="flex min-w-0 justify-between gap-2"
              >
                <span class="min-w-0 break-all font-mono">
                  {{ entry.reason }}
                </span>
                <span class="shrink-0 font-mono tabular-nums">
                  {{ entry.count }}
                </span>
              </p>
            </div>
          </article>
        </div>
      </template>
    </Card>

    <Card class="min-w-0" size="small">
      <template #title>
        <h3 class="text-sm font-semibold">
          {{ $t('page.research.feedback.detail.drift.title') }}
        </h3>
      </template>

      <Empty
        v-if="detail.drift_reports.length === 0"
        :description="$t('page.research.feedback.detail.drift.empty')"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />
      <div v-else class="grid min-w-0 gap-3 xl:grid-cols-2">
        <article
          v-for="report in detail.drift_reports"
          :key="report.drift_report_id"
          class="min-w-0 rounded-md border p-3"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0">
              <h4 class="font-mono text-sm font-medium">
                {{
                  $t(
                    `page.research.feedback.detail.drift.metric.${report.metric}`,
                  )
                }}
              </h4>
              <p class="mt-1 text-xs text-muted-foreground">
                {{
                  $t(`page.research.feedback.detail.drift.kind.${report.kind}`)
                }}
              </p>
            </div>
            <Tag :color="driftColor(report.assessment)">
              {{
                $t(
                  `page.research.feedback.detail.drift.assessment.${report.assessment}`,
                )
              }}
            </Tag>
          </div>

          <Descriptions :column="1" class="mt-3" size="small">
            <DescriptionsItem
              :label="$t('page.research.feedback.detail.drift.reportId')"
            >
              <span class="break-all font-mono text-xs">
                {{ report.drift_report_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.feedback.detail.drift.observed')"
            >
              <span class="font-mono tabular-nums">
                {{
                  report.observed_value ??
                  $t('page.research.feedback.detail.notObserved')
                }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.feedback.detail.drift.threshold')"
            >
              <span class="font-mono tabular-nums">
                {{ report.threshold }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.feedback.detail.drift.samples')"
            >
              <span class="font-mono tabular-nums">
                {{ report.sample_count }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.feedback.detail.drift.baselineWindow')"
            >
              {{ formatDateTimeLocal(report.baseline_window_start) }} →
              {{ formatDateTimeLocal(report.baseline_window_end) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.feedback.detail.drift.evaluationWindow')
              "
            >
              {{ formatDateTimeLocal(report.evaluation_window_start) }} →
              {{ formatDateTimeLocal(report.evaluation_window_end) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.feedback.detail.drift.labelCutoff')"
            >
              {{ formatDateTimeLocal(report.label_cutoff) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.feedback.detail.drift.observedAt')"
            >
              {{ formatDateTimeLocal(report.observed_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.feedback.detail.drift.detailUri')"
            >
              <span class="break-all font-mono text-xs">
                {{ report.detail_uri }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.feedback.detail.drift.detailHash')"
            >
              <span class="break-all font-mono text-xs">
                {{ report.detail_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.feedback.detail.drift.reportHash')"
            >
              <span class="break-all font-mono text-xs">
                {{ report.report_hash }}
              </span>
            </DescriptionsItem>
          </Descriptions>
        </article>
      </div>
    </Card>

    <Card class="min-w-0" size="small">
      <template #title>
        <h3 class="text-sm font-semibold">
          {{ $t('page.research.feedback.detail.comparison.title') }}
        </h3>
      </template>

      <Empty
        v-if="detail.evaluation_uses.length === 0"
        :description="$t('page.research.feedback.detail.comparison.empty')"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />
      <div v-else class="space-y-3">
        <article
          v-for="evaluation in detail.evaluation_uses"
          :key="evaluation.feedback_evaluation_use_id"
          class="min-w-0 rounded-md border p-3"
        >
          <Descriptions
            :key="`evaluation-${evaluation.feedback_evaluation_use_id}-${descriptionColumn}`"
            :column="descriptionColumn"
            size="small"
          >
            <DescriptionsItem
              :label="$t('page.research.feedback.detail.comparison.useId')"
              span="filled"
            >
              <span class="break-all font-mono text-xs">
                {{ evaluation.feedback_evaluation_use_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.feedback.detail.comparison.purpose')"
            >
              <span class="font-mono text-xs">{{ evaluation.purpose }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.feedback.detail.comparison.profileArtifact')
              "
            >
              <span class="break-all font-mono text-xs">
                {{ evaluation.research_profile_artifact_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.feedback.detail.comparison.datasetPurpose')
              "
            >
              <span class="font-mono text-xs">
                {{ evaluation.dataset_purpose }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.feedback.detail.comparison.datasetId')"
            >
              <span class="break-all font-mono text-xs">
                {{ evaluation.evaluation_dataset_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.feedback.detail.comparison.datasetHash')
              "
            >
              <span class="break-all font-mono text-xs">
                {{ evaluation.evaluation_dataset_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.feedback.detail.comparison.bytesHash')"
            >
              <span class="break-all font-mono text-xs">
                {{ evaluation.evaluation_artifact_bytes_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.feedback.detail.comparison.cohortHash')"
            >
              <span class="break-all font-mono text-xs">
                {{ evaluation.cohort_manifest_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.feedback.detail.comparison.comparisonHash')
              "
            >
              <span class="break-all font-mono text-xs">
                {{ evaluation.comparison_contract_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.feedback.detail.comparison.familyHash')"
            >
              <span class="break-all font-mono text-xs">
                {{ evaluation.candidate_family_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.feedback.detail.comparison.semanticHash')
              "
            >
              <span class="break-all font-mono text-xs">
                {{ evaluation.semantic_use_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.feedback.detail.comparison.champion')"
            >
              <span class="break-all font-mono text-xs">
                {{ evaluation.champion_model_version_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.feedback.detail.comparison.championHash')
              "
            >
              <span class="break-all font-mono text-xs">
                {{ evaluation.champion_serving_contract_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.feedback.detail.comparison.cpcvUri')"
            >
              <span class="break-all font-mono text-xs">
                {{ evaluation.cpcv_artifact_uri }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.feedback.detail.comparison.cpcvHash')"
            >
              <span class="break-all font-mono text-xs">
                {{ evaluation.cpcv_artifact_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.feedback.detail.comparison.useHash')"
            >
              <span class="break-all font-mono text-xs">
                {{ evaluation.evaluation_use_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.feedback.detail.comparison.window')"
            >
              {{ formatDateTimeLocal(evaluation.evaluation_window_start) }} →
              {{ formatDateTimeLocal(evaluation.evaluation_window_end) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.feedback.detail.comparison.labelCutoff')
              "
            >
              {{ formatDateTimeLocal(evaluation.label_cutoff) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.feedback.detail.comparison.reservedAt')"
            >
              {{ formatDateTimeLocal(evaluation.reserved_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.feedback.detail.comparison.createdAt')"
            >
              {{ formatDateTimeLocal(evaluation.created_at) }}
            </DescriptionsItem>
          </Descriptions>
        </article>
      </div>
    </Card>
  </section>
</template>
