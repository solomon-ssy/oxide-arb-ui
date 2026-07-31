<script lang="ts" setup>
import type { FeedbackTruthOperationsView } from '@vben/types';

import { computed } from 'vue';

import { Alert, Descriptions, DescriptionsItem } from 'antdv-next';

import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';

const props = defineProps<{
  snapshot: FeedbackTruthOperationsView;
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
        {{ formatDateTimeLocal(snapshot.resolution_verified_through) }}
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
  </section>
</template>
