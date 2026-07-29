import type { ResearchFeedbackEvent } from '@vben/types';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useFeedbackStore } from './feedback';

function event(revision: number): ResearchFeedbackEvent {
  return {
    occurred_at: '2026-07-29T01:00:00.000Z',
    profile_id: 'crypto_price_15m',
    revision,
    subject_id: '019fa8be-8a00-7f00-8000-000000000001',
    subject_kind: 'feedback_cycle',
  };
}

describe('feedback revision store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('ignores duplicate and out-of-order replay hints', () => {
    const store = useFeedbackStore();

    expect(store.applyEvent(event(8))).toBe(true);
    expect(store.applyEvent(event(8))).toBe(false);
    expect(store.applyEvent(event(7))).toBe(false);

    expect(store.revision).toBe(8);
    expect(store.refreshGeneration).toBe(1);
  });

  it('clears recovery only with a non-regressing authoritative revision', () => {
    const store = useFeedbackStore();
    store.applyEvent(event(8));
    store.requireRecovery('replay_window_exceeded');

    expect(store.reconcileRevision(7)).toBe(false);
    expect(store.recoveryReason).toBe('revision_regression');
    expect(store.recoveryRequired).toBe(true);

    expect(store.reconcileRevision(12)).toBe(true);
    expect(store.revision).toBe(12);
    expect(store.recoveryReason).toBeNull();
    expect(store.recoveryRequired).toBe(false);
  });

  it('rejects unsafe numeric cursors', () => {
    const store = useFeedbackStore();

    expect(store.reconcileRevision(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
    expect(store.recoveryReason).toBe('invalid_overview_revision');
    expect(store.revision).toBe(0);
  });

  it('rejects websocket hints while authoritative recovery is pending', () => {
    const store = useFeedbackStore();
    store.applyEvent(event(8));
    store.requireRecovery('replay_unavailable');

    expect(store.applyEvent(event(9))).toBe(false);
    expect(store.revision).toBe(8);
    expect(store.lastEvent).toEqual(event(8));
  });
});
