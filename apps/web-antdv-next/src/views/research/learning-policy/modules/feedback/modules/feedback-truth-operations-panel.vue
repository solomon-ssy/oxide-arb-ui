<script lang="ts" setup>
import type {
  FeedbackTruthOperationsView,
  ResolutionProjectionAttentionItem,
  ResolutionRemediationAction,
} from '@vben/types';

import { computed } from 'vue';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Tag,
} from 'antdv-next';

import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';

const props = defineProps<{
  canRemediate: boolean;
  pendingActions: Set<string>;
  snapshot: FeedbackTruthOperationsView;
}>();

const emit = defineEmits<{
  remediate: [
    item: ResolutionProjectionAttentionItem,
    action: ResolutionRemediationAction,
  ];
}>();

const hasQuarantine = computed(
  () => props.snapshot.resolution_quarantined_count > 0,
);
const hasLag = computed(
  () =>
    props.snapshot.resolution_unresolved_count > 0 ||
    props.snapshot.execution_attempt_unsealed_count > 0 ||
    props.snapshot.recommendation_rollup_unsealed_count > 0,
);
const alertType = computed(() => {
  if (hasQuarantine.value) {
    return 'error';
  }
  return hasLag.value ? 'warning' : 'success';
});
const alertKey = computed(() => {
  if (hasQuarantine.value) {
    return 'quarantined';
  }
  return hasLag.value ? 'lagging' : 'healthy';
});

function unresolvedAge() {
  const oldest = props.snapshot.resolution_oldest_unresolved_at;
  if (oldest === null) {
    return $t('page.research.feedback.truthOps.notApplicable');
  }
  const observedMs = Date.parse(props.snapshot.observed_at);
  const oldestMs = Date.parse(oldest);
  if (!Number.isFinite(observedMs) || !Number.isFinite(oldestMs)) {
    return $t('page.research.feedback.truthOps.invalidTimestamp');
  }
  const seconds = Math.max(0, Math.floor((observedMs - oldestMs) / 1000));
  return $t('page.research.feedback.truthOps.ageSeconds', { value: seconds });
}
</script>

<template>
  <section
    aria-labelledby="feedback-truth-operations-title"
    class="mt-6 space-y-4"
  >
    <div>
      <h2 id="feedback-truth-operations-title" class="text-base font-semibold">
        {{ $t('page.research.feedback.truthOps.title') }}
      </h2>
      <p class="mt-1 text-sm text-muted-foreground">
        {{ $t('page.research.feedback.truthOps.description') }}
      </p>
    </div>

    <Alert
      :description="
        $t(`page.research.feedback.truthOps.state.${alertKey}Description`)
      "
      :message="$t(`page.research.feedback.truthOps.state.${alertKey}`)"
      show-icon
      :type="alertType"
    />

    <Descriptions
      :column="{ lg: 2, md: 2, sm: 1, xl: 2, xs: 1, xxl: 2 }"
      bordered
      size="small"
    >
      <DescriptionsItem
        :label="$t('page.research.feedback.truthOps.resolutionBacklog')"
      >
        {{ snapshot.resolution_unresolved_count }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.feedback.truthOps.quarantined')"
      >
        {{ snapshot.resolution_quarantined_count }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.feedback.truthOps.mappingBlocked')"
      >
        {{ snapshot.resolution_mapping_blocked_count }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.feedback.truthOps.excluded')">
        {{ snapshot.resolution_excluded_count }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.feedback.truthOps.oldestUnresolved')"
      >
        <template v-if="snapshot.resolution_oldest_unresolved_at">
          {{ formatDateTimeLocal(snapshot.resolution_oldest_unresolved_at) }}
          · {{ unresolvedAge() }}
        </template>
        <template v-else>
          {{ $t('page.research.feedback.truthOps.notApplicable') }}
        </template>
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.feedback.truthOps.resolutionWatermark')"
      >
        {{ formatDateTimeLocal(snapshot.resolution_terminal_through) }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.feedback.truthOps.attemptBacklog')"
      >
        {{ snapshot.execution_attempt_unsealed_count }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.feedback.truthOps.attemptWatermark')"
      >
        {{ formatDateTimeLocal(snapshot.execution_attempt_sealed_through) }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.feedback.truthOps.rollupBacklog')"
      >
        {{ snapshot.recommendation_rollup_unsealed_count }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.feedback.truthOps.rollupWatermark')"
      >
        {{ formatDateTimeLocal(snapshot.recommendation_rollup_sealed_through) }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.feedback.truthOps.observedAt')"
        span="filled"
      >
        {{ formatDateTimeLocal(snapshot.observed_at) }}
      </DescriptionsItem>
    </Descriptions>

    <div class="space-y-3">
      <h3 class="text-sm font-semibold">
        {{ $t('page.research.feedback.truthOps.attentionTitle') }}
      </h3>
      <p
        v-if="snapshot.resolution_attention.length === 0"
        class="text-sm text-muted-foreground"
      >
        {{ $t('page.research.feedback.truthOps.attentionEmpty') }}
      </p>
      <template v-else>
        <Card
          v-for="item in snapshot.resolution_attention"
          :key="item.observation.resolution_observation_id"
          class="mb-3"
          size="small"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <Tag
                  :color="
                    item.projection.status === 'quarantined'
                      ? 'error'
                      : item.projection.status === 'mapping_blocked'
                        ? 'warning'
                        : 'default'
                  "
                >
                  {{
                    $t(
                      `page.research.feedback.truthOps.projectionStatus.${item.projection.status}`,
                    )
                  }}
                </Tag>
                <span class="font-mono text-xs tabular-nums">
                  rev {{ item.projection.revision }}
                </span>
              </div>
              <p class="mt-2 break-all font-mono text-xs">
                {{ item.observation.resolution_observation_id }}
              </p>
              <p class="mt-1 text-sm">
                {{ item.observation.market_id }}
              </p>
            </div>
            <div
              v-if="
                canRemediate &&
                (item.projection.status === 'mapping_blocked' ||
                  item.projection.status === 'quarantined')
              "
              class="flex flex-wrap gap-2"
            >
              <Button
                :loading="
                  pendingActions.has(
                    `resolution-remediation:${item.observation.resolution_observation_id}:requeue`,
                  )
                "
                size="small"
                @click="emit('remediate', item, 'requeue')"
              >
                {{ $t('page.research.feedback.truthOps.actions.requeue') }}
              </Button>
              <Button
                danger
                :loading="
                  pendingActions.has(
                    `resolution-remediation:${item.observation.resolution_observation_id}:exclude`,
                  )
                "
                size="small"
                @click="emit('remediate', item, 'exclude')"
              >
                {{ $t('page.research.feedback.truthOps.actions.exclude') }}
              </Button>
            </div>
          </div>

          <Descriptions class="mt-3" :column="1" size="small">
            <DescriptionsItem
              :label="$t('page.research.feedback.truthOps.sourceEvidence')"
            >
              <span class="break-all font-mono text-xs">
                {{ item.observation.raw_uri }} ·
                {{ item.observation.raw_payload_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.feedback.truthOps.typedError')"
            >
              <span class="font-mono text-xs">
                {{ item.projection.last_error_code }}
              </span>
              <span class="ml-2">{{ item.projection.last_error }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.feedback.truthOps.remediationHistory')"
            >
              <ol
                v-if="item.remediations.length > 0"
                class="list-decimal space-y-1 pl-5"
              >
                <li
                  v-for="remediation in item.remediations"
                  :key="remediation.remediation_id"
                >
                  <span class="font-mono text-xs">
                    {{ remediation.prior_status }} →
                    {{ remediation.resulting_status }}
                  </span>
                  · {{ remediation.reason_code }} ·
                  {{ remediation.actor_username }} ·
                  {{ formatDateTimeLocal(remediation.created_at) }}
                </li>
              </ol>
              <span v-else>
                {{ $t('page.research.feedback.truthOps.noRemediation') }}
              </span>
            </DescriptionsItem>
          </Descriptions>
        </Card>
      </template>
    </div>
  </section>
</template>
