import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useOrderIntentStore } from './order-intent';

describe('useOrderIntentStore ws toast suppression', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const event = {
    event: 'approved' as const,
    occurred_at: '2026-06-11T12:00:00.000Z',
    order_intent_id: 'intent-1',
    reason: null,
    recommendation_id: 'rec-1',
    status: 'authorized' as const,
  };

  it('shows WS toast by default', () => {
    const store = useOrderIntentStore();
    store.bumpRevision(event);
    expect(store.shouldShowWsToast(event)).toBe(true);
  });

  it('suppresses echo toast after local governed action', () => {
    const store = useOrderIntentStore();
    store.suppressWsToastForIntent('intent-1');
    store.bumpRevision(event);
    expect(store.shouldShowWsToast(event)).toBe(false);
  });

  it('does not suppress toast for other operators intents', () => {
    const store = useOrderIntentStore();
    store.suppressWsToastForIntent('intent-1');
    const otherEvent = { ...event, order_intent_id: 'intent-2' };
    store.bumpRevision(otherEvent);
    expect(store.shouldShowWsToast(otherEvent)).toBe(true);
  });
});
