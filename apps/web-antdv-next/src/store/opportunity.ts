import type { OpportunityView, SyncSnapshot } from '@vben/types';

import { ref } from 'vue';

import { defineStore } from 'pinia';

/** Ring-buffer capacity of the live opportunity feed. */
const FEED_CAP = 200;

/**
 * Live opportunity feed: WS `opportunity.detected` prepends, `sync` replaces.
 * Both paths carry the same slim `OpportunityView` wire shape.
 */
export const useOpportunityStore = defineStore('oxide-opportunity', () => {
  const feed = ref<OpportunityView[]>([]);

  function prependFeed(item: OpportunityView) {
    // Dedup on id (a reconnect replay may re-push a recent detection).
    const existing = feed.value.findIndex(
      (o) => o.opportunity_id === item.opportunity_id,
    );
    if (existing !== -1) {
      feed.value.splice(existing, 1);
    }
    feed.value.unshift(item);
    if (feed.value.length > FEED_CAP) {
      feed.value.length = FEED_CAP;
    }
  }

  function applySyncSnapshot(snapshot: SyncSnapshot) {
    if (snapshot.recent_opportunities) {
      feed.value = snapshot.recent_opportunities.slice(0, FEED_CAP);
    }
  }

  function $reset() {
    feed.value = [];
  }

  return {
    $reset,
    applySyncSnapshot,
    feed,
    prependFeed,
  };
});
