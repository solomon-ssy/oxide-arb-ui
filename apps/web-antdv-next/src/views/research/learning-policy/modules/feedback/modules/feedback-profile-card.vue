<script lang="ts" setup>
import type {
  FeedbackProfileOverviewView,
  FeedbackReadinessView,
} from '@vben/types';

import { computed } from 'vue';

import { Card, Descriptions, DescriptionsItem, Divider, Tag } from 'antdv-next';

import { $t } from '#/locales';
import EnumTag from '#/shared/components/enum-tag.vue';
import {
  formatDateTimeLocal,
  formatDurationSecs,
} from '#/shared/components/format';
import StatusChip from '#/shared/components/status-chip.vue';

import { feedbackProfilePresentation } from './feedback-profile-presentation';

const props = defineProps<{
  profile: FeedbackProfileOverviewView;
  readiness: FeedbackReadinessView | null;
}>();

const presentation = computed(() =>
  feedbackProfilePresentation(props.profile, props.readiness),
);

const headingId = computed(
  () => `feedback-profile-${presentation.value.profileId}`,
);

function readinessColor() {
  switch (presentation.value.readinessState) {
    case 'blocked': {
      return 'error';
    }
    case 'not_observed': {
      return 'warning';
    }
    case 'ready': {
      return 'success';
    }
  }
}

function coverageColor() {
  switch (presentation.value.coverageState) {
    case 'advance': {
      return 'success';
    }
    case 'no_action': {
      return 'default';
    }
    case 'not_observed': {
      return 'warning';
    }
  }
}

function gateLabel(value: boolean | null) {
  if (value === null) {
    return $t('page.research.feedback.profile.gate.notObserved');
  }
  return value
    ? $t('page.research.feedback.profile.gate.passed')
    : $t('page.research.feedback.profile.gate.blocked');
}
</script>

<template>
  <section :aria-labelledby="headingId" class="min-w-0">
    <Card class="h-full min-w-0" size="small">
      <template #title>
        <div class="min-w-0">
          <h3 :id="headingId" class="truncate font-mono text-sm font-semibold">
            {{ presentation.profileId }}
          </h3>
          <p class="mt-1 text-xs font-normal text-muted-foreground">
            {{
              $t('page.research.feedback.profile.version', {
                version: presentation.profileVersion,
              })
            }}
          </p>
        </div>
      </template>
      <template #extra>
        <div class="flex flex-wrap justify-end gap-1">
          <Tag>
            {{
              presentation.category
                ? $t(`enum.marketCategory.${presentation.category}`)
                : $t('page.research.feedback.profile.category.control')
            }}
          </Tag>
          <Tag :color="readinessColor()">
            {{
              $t(
                `page.research.feedback.profile.readiness.${presentation.readinessState}`,
              )
            }}
          </Tag>
        </div>
      </template>

      <Descriptions :column="1" size="small">
        <DescriptionsItem
          :label="$t('page.research.feedback.profile.activationTrack')"
        >
          {{
            $t(
              `page.research.feedback.profile.track.${presentation.activationEligibility}`,
            )
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.profile.policyHash')"
        >
          <span class="break-all font-mono text-xs">
            {{ presentation.feedbackPolicyHash }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.profile.profileHash')"
        >
          <span class="break-all font-mono text-xs">
            {{ presentation.profileContentHash }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.profile.evaluationWindow')"
        >
          {{
            $t('page.research.feedback.profile.days', {
              days: presentation.evaluationWindowDays,
            })
          }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.research.feedback.profile.cadence')">
          {{ formatDurationSecs(presentation.feedbackCadenceSecs) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.profile.cooldown')"
        >
          {{ formatDurationSecs(presentation.retrainingCooldownSecs) }}
        </DescriptionsItem>
      </Descriptions>

      <Divider plain title-placement="left">
        {{ $t('page.research.feedback.profile.readiness.title') }}
      </Divider>
      <Descriptions :column="1" size="small">
        <DescriptionsItem
          :label="$t('page.research.feedback.profile.readiness.history')"
        >
          <span v-if="presentation.observedHistoryDays !== null">
            {{
              $t('page.research.feedback.profile.readiness.historyValue', {
                observed: presentation.observedHistoryDays,
                required: presentation.requiredHistoryDays,
              })
            }}
          </span>
          <span v-else>
            {{ $t('page.research.feedback.profile.notObserved') }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.profile.readiness.retention')"
        >
          <Tag
            :color="
              presentation.retentionReady === true ? 'success' : 'warning'
            "
          >
            {{ gateLabel(presentation.retentionReady) }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.profile.readiness.latency')"
        >
          <Tag
            :color="presentation.latencyReady === true ? 'success' : 'warning'"
          >
            {{ gateLabel(presentation.latencyReady) }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.profile.readiness.observedAt')"
        >
          {{
            presentation.observedAt
              ? formatDateTimeLocal(presentation.observedAt)
              : $t('page.research.feedback.profile.notObserved')
          }}
        </DescriptionsItem>
      </Descriptions>

      <Divider plain title-placement="left">
        {{ $t('page.research.feedback.profile.coverage.title') }}
      </Divider>
      <Descriptions :column="1" size="small">
        <DescriptionsItem
          :label="$t('page.research.feedback.profile.coverage.decision')"
        >
          <Tag :color="coverageColor()">
            {{
              $t(
                `page.research.feedback.profile.coverage.state.${presentation.coverageState}`,
              )
            }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.profile.coverage.observed')"
        >
          <span class="font-mono tabular-nums">
            {{
              presentation.coverage ??
              $t('page.research.feedback.profile.notObserved')
            }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.profile.coverage.minimum')"
        >
          <span class="font-mono tabular-nums">
            {{ presentation.minimumCoverage }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.profile.coverage.matureLabels')"
        >
          {{
            presentation.matureLabelCount === null
              ? $t('page.research.feedback.profile.notObserved')
              : `${presentation.matureLabelCount} / ${presentation.minimumMatureLabels}`
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.profile.coverage.newMatureLabels')"
        >
          {{
            presentation.newMatureLabelCount === null
              ? $t('page.research.feedback.profile.notObserved')
              : `${presentation.newMatureLabelCount} / ${presentation.minimumNewMatureLabels}`
          }}
        </DescriptionsItem>
        <DescriptionsItem
          v-if="presentation.coverageReasonCode"
          :label="$t('page.research.feedback.profile.coverage.reason')"
        >
          <span class="break-all font-mono text-xs">
            {{ presentation.coverageReasonCode }}
          </span>
        </DescriptionsItem>
      </Descriptions>

      <Divider plain title-placement="left">
        {{ $t('page.research.feedback.profile.latest.title') }}
      </Divider>
      <Descriptions :column="1" size="small">
        <DescriptionsItem
          :label="$t('page.research.feedback.profile.latest.status')"
        >
          <EnumTag
            v-if="presentation.latestCycleStatus"
            context="feedback-profile-card"
            name="FeedbackCycleStatus"
            :value="presentation.latestCycleStatus"
          />
          <StatusChip v-else tone="warning">
            {{ $t('page.research.feedback.profile.notObserved') }}
          </StatusChip>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.profile.latest.cycleId')"
        >
          <span class="break-all font-mono text-xs">
            {{
              presentation.latestCycleId ??
              $t('page.research.feedback.profile.notObserved')
            }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.profile.latest.decision')"
        >
          {{
            presentation.latestDecision
              ? $t(
                  `page.research.feedback.decision.${presentation.latestDecision}`,
                )
              : $t('page.research.feedback.profile.notObserved')
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.profile.latest.championModel')"
        >
          <span class="break-all font-mono text-xs">
            {{
              presentation.championModelVersionId ??
              $t('page.research.feedback.profile.notObserved')
            }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.profile.latest.championHash')"
        >
          <span class="break-all font-mono text-xs">
            {{
              presentation.championServingContractHash ??
              $t('page.research.feedback.profile.notObserved')
            }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.profile.latest.updatedAt')"
        >
          {{
            presentation.latestUpdatedAt
              ? formatDateTimeLocal(presentation.latestUpdatedAt)
              : $t('page.research.feedback.profile.notObserved')
          }}
        </DescriptionsItem>
      </Descriptions>
    </Card>
  </section>
</template>
