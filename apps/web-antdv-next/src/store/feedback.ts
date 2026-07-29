import type { ResearchFeedbackEvent } from '@vben/types';

import { ref } from 'vue';

import { defineStore } from 'pinia';

export type FeedbackRecoveryReason =
  | 'invalid_feedback_event'
  | 'invalid_overview_revision'
  | 'replay_unavailable'
  | 'replay_window_exceeded'
  | 'revision_regression';

function isValidRevision(revision: number): boolean {
  return Number.isSafeInteger(revision) && revision >= 0;
}

/**
 * Durable feedback invalidation cursor.
 *
 * The authoritative overview and cycle data remain REST-owned. This store only
 * coordinates cross-page refreshes and reconnect replay.
 */
export const useFeedbackStore = defineStore('qp-feedback', () => {
  const revision = ref(0);
  const refreshGeneration = ref(0);
  const lastEvent = ref<null | ResearchFeedbackEvent>(null);
  const recoveryRequired = ref(false);
  const recoveryReason = ref<FeedbackRecoveryReason | null>(null);

  function applyEvent(event: ResearchFeedbackEvent): boolean {
    if (!isValidRevision(event.revision)) {
      requireRecovery('invalid_feedback_event');
      return false;
    }
    if (recoveryRequired.value) {
      return false;
    }
    if (event.revision <= revision.value) {
      return false;
    }
    revision.value = event.revision;
    lastEvent.value = event;
    refreshGeneration.value += 1;
    return true;
  }

  function requireRecovery(reason: FeedbackRecoveryReason) {
    recoveryRequired.value = true;
    recoveryReason.value = reason;
    refreshGeneration.value += 1;
  }

  function reconcileRevision(nextRevision: number): boolean {
    if (!isValidRevision(nextRevision)) {
      requireRecovery('invalid_overview_revision');
      return false;
    }
    if (nextRevision < revision.value) {
      requireRecovery('revision_regression');
      return false;
    }
    revision.value = nextRevision;
    recoveryRequired.value = false;
    recoveryReason.value = null;
    refreshGeneration.value += 1;
    return true;
  }

  function $reset() {
    revision.value = 0;
    refreshGeneration.value = 0;
    lastEvent.value = null;
    recoveryRequired.value = false;
    recoveryReason.value = null;
  }

  return {
    $reset,
    applyEvent,
    lastEvent,
    reconcileRevision,
    recoveryReason,
    recoveryRequired,
    refreshGeneration,
    requireRecovery,
    revision,
  };
});
