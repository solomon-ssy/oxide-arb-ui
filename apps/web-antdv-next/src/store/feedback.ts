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
  const cursorInitialized = ref(false);
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
    cursorInitialized.value = true;
    lastEvent.value = event;
    refreshGeneration.value += 1;
    return true;
  }

  function requireRecovery(reason: FeedbackRecoveryReason) {
    recoveryRequired.value = true;
    recoveryReason.value = reason;
    cursorInitialized.value = false;
    refreshGeneration.value += 1;
  }

  function adoptAuthoritativeRevision(nextRevision: number): boolean {
    if (!isValidRevision(nextRevision)) {
      requireRecovery('invalid_overview_revision');
      return false;
    }
    if (nextRevision < revision.value) {
      requireRecovery('revision_regression');
      return false;
    }
    revision.value = nextRevision;
    cursorInitialized.value = true;
    recoveryRequired.value = false;
    recoveryReason.value = null;
    return true;
  }

  function $reset() {
    revision.value = 0;
    cursorInitialized.value = false;
    refreshGeneration.value = 0;
    lastEvent.value = null;
    recoveryRequired.value = false;
    recoveryReason.value = null;
  }

  return {
    $reset,
    adoptAuthoritativeRevision,
    applyEvent,
    cursorInitialized,
    lastEvent,
    recoveryReason,
    recoveryRequired,
    refreshGeneration,
    requireRecovery,
    revision,
  };
});
