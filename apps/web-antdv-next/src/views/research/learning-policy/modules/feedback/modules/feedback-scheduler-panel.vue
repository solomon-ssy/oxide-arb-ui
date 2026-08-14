<script lang="ts" setup>
import type {
  FeedbackSchedulerListView,
  FeedbackSchedulerStateView,
} from '@vben/types';

import { computed } from 'vue';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  Tag,
} from 'antdv-next';

import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';

const props = defineProps<{
  canControl: boolean;
  error: null | string;
  loading: boolean;
  pendingActions: Set<string>;
  snapshot: FeedbackSchedulerListView | null;
}>();

const emit = defineEmits<{
  control: [state: FeedbackSchedulerStateView, paused: boolean];
  retry: [];
}>();

const orderedItems = computed(() =>
  (props.snapshot?.items ?? []).toSorted((left, right) =>
    left.research_profile_id.localeCompare(right.research_profile_id),
  ),
);

type SchedulerDisplayState =
  | 'leased'
  | 'paused'
  | 'pending'
  | 'retrying'
  | 'scheduled'
  | 'settlement_failed';

function schedulerState(
  state: FeedbackSchedulerStateView,
): SchedulerDisplayState {
  if (
    state.last_failure_kind === 'settlement' ||
    state.last_settlement_error !== null
  ) {
    return 'settlement_failed';
  }
  if (state.lease_owner !== null) {
    return 'leased';
  }
  if (state.retry_at !== null || state.last_error !== null) {
    return 'retrying';
  }
  if (state.pending_cutoff !== null) {
    return 'pending';
  }
  if (state.paused) {
    return 'paused';
  }
  return 'scheduled';
}

function stateColor(state: FeedbackSchedulerStateView) {
  switch (schedulerState(state)) {
    case 'leased': {
      return 'processing';
    }
    case 'paused': {
      return 'warning';
    }
    case 'pending': {
      return 'cyan';
    }
    case 'retrying': {
      return 'error';
    }
    case 'scheduled': {
      return 'success';
    }
    case 'settlement_failed': {
      return 'error';
    }
  }
}

function formatDuration(seconds: number) {
  if (seconds % 86_400 === 0) {
    return $t('page.research.feedback.scheduler.days', {
      value: seconds / 86_400,
    });
  }
  if (seconds % 3600 === 0) {
    return $t('page.research.feedback.scheduler.hours', {
      value: seconds / 3600,
    });
  }
  return $t('page.research.feedback.scheduler.seconds', { value: seconds });
}
</script>

<template>
  <section aria-labelledby="feedback-scheduler-title" class="mt-6 space-y-4">
    <div>
      <h2 id="feedback-scheduler-title" class="text-base font-semibold">
        {{ $t('page.research.feedback.scheduler.title') }}
      </h2>
      <p class="mt-1 text-sm text-muted-foreground">
        {{ $t('page.research.feedback.scheduler.description') }}
      </p>
    </div>

    <Alert v-if="error" :message="error" show-icon type="warning">
      <template #action>
        <Button class="min-h-11" @click="emit('retry')">
          {{ $t('page.research.feedback.retry') }}
        </Button>
      </template>
    </Alert>

    <Empty
      v-if="!loading && orderedItems.length === 0"
      :description="$t('page.research.feedback.scheduler.empty')"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />

    <div :aria-busy="loading" class="grid min-w-0 gap-4 xl:grid-cols-2">
      <Card
        v-for="state in orderedItems"
        :key="state.research_profile_id"
        size="small"
      >
        <template #title>
          <span class="break-all font-mono text-xs">
            {{ state.research_profile_id }}
          </span>
        </template>
        <template #extra>
          <Tag :color="stateColor(state)">
            {{
              $t(
                `page.research.feedback.scheduler.state.${schedulerState(state)}`,
              )
            }}
          </Tag>
        </template>

        <Descriptions
          :column="{ lg: 2, md: 2, sm: 1, xl: 2, xs: 1, xxl: 2 }"
          bordered
          size="small"
        >
          <DescriptionsItem
            :label="$t('page.research.feedback.scheduler.nextDue')"
          >
            {{ formatDateTimeLocal(state.next_due_at) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.scheduler.pendingCutoff')"
          >
            {{
              state.pending_cutoff
                ? formatDateTimeLocal(state.pending_cutoff)
                : $t('page.research.feedback.detail.notObserved')
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.scheduler.pendingStarted')"
          >
            {{
              state.pending_started_at
                ? formatDateTimeLocal(state.pending_started_at)
                : $t('page.research.feedback.detail.notObserved')
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.scheduler.cooldownUntil')"
          >
            {{
              state.cooldown_until
                ? formatDateTimeLocal(state.cooldown_until)
                : $t('page.research.feedback.detail.notObserved')
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.scheduler.cadence')"
          >
            {{ formatDuration(state.cadence_secs) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.scheduler.cooldown')"
          >
            {{ formatDuration(state.cooldown_secs) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.scheduler.lease')"
          >
            <span v-if="state.lease_owner" class="break-all font-mono text-xs">
              {{ state.lease_owner }} ·
              {{
                state.lease_expires_at
                  ? formatDateTimeLocal(state.lease_expires_at)
                  : $t('page.research.feedback.detail.notObserved')
              }}
            </span>
            <span v-else>
              {{ $t('page.research.feedback.detail.notObserved') }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.scheduler.retry')"
          >
            {{
              state.retry_at
                ? `${formatDateTimeLocal(state.retry_at)} · ${state.last_failure_kind ?? 'unknown'} · #${state.attempt}`
                : $t('page.research.feedback.detail.notObserved')
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.scheduler.lastCutoff')"
          >
            {{
              state.last_cutoff
                ? formatDateTimeLocal(state.last_cutoff)
                : $t('page.research.feedback.detail.notObserved')
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.scheduler.lastCycle')"
          >
            <span class="break-all font-mono text-xs">
              {{
                state.last_cycle_id ??
                $t('page.research.feedback.detail.notObserved')
              }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.scheduler.coalescedGaps')"
          >
            {{ state.coalesced_gap_count }}
            <span
              v-if="state.last_coalesced_from && state.last_coalesced_to"
              class="block text-xs text-muted-foreground"
            >
              {{ formatDateTimeLocal(state.last_coalesced_from) }} →
              {{ formatDateTimeLocal(state.last_coalesced_to) }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.scheduler.settlementFailures')"
          >
            {{ state.settlement_failure_count }}
            <span
              v-if="state.last_settlement_failed_at"
              class="block text-xs text-muted-foreground"
            >
              {{ formatDateTimeLocal(state.last_settlement_failed_at) }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.scheduler.pauseRevision')"
          >
            {{ state.pause_revision }}
          </DescriptionsItem>
          <DescriptionsItem
            v-if="state.last_error"
            :label="$t('page.research.feedback.scheduler.lastError')"
            span="filled"
          >
            {{ state.last_error }}
          </DescriptionsItem>
          <DescriptionsItem
            v-if="state.last_settlement_error"
            :label="$t('page.research.feedback.scheduler.settlementError')"
            span="filled"
          >
            {{ state.last_settlement_error }}
          </DescriptionsItem>
          <DescriptionsItem
            v-if="state.pause_note"
            :label="$t('page.research.feedback.scheduler.pauseNote')"
            span="filled"
          >
            {{ state.pause_note }}
          </DescriptionsItem>
        </Descriptions>

        <Button
          v-if="canControl"
          class="mt-4 min-h-11"
          :danger="!state.paused"
          :loading="
            pendingActions.has(
              `scheduler:${state.research_profile_id}:${state.paused ? 'resume' : 'pause'}`,
            )
          "
          @click="emit('control', state, !state.paused)"
        >
          {{
            $t(
              state.paused
                ? 'page.research.feedback.scheduler.resume'
                : 'page.research.feedback.scheduler.pause',
            )
          }}
        </Button>
      </Card>
    </div>

    <p v-if="snapshot" class="text-xs text-muted-foreground">
      {{ $t('page.research.feedback.scheduler.observedAt') }}:
      {{ formatDateTimeLocal(snapshot.observed_at) }}
    </p>
  </section>
</template>
