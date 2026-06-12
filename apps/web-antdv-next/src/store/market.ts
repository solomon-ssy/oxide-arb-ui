import type { MarketBookView, MarketId } from '@vben/types';

import { ref } from 'vue';

import { defineStore } from 'pinia';

/**
 * Per-market live order books (WS `market.book_update`, market-scoped
 * subscriptions) and the set of markets resolved during this session.
 */
export const useMarketStore = defineStore('oxide-market', () => {
  const books = ref<Record<MarketId, MarketBookView>>({});
  const resolved = ref<Set<MarketId>>(new Set());

  function setBook(view: MarketBookView) {
    books.value[view.market_id] = view;
  }

  function removeBook(marketId: MarketId) {
    const { [marketId]: _removed, ...rest } = books.value;
    books.value = rest;
  }

  function markResolved(marketId: MarketId) {
    resolved.value.add(marketId);
  }

  function $reset() {
    books.value = {};
    resolved.value = new Set();
  }

  return {
    $reset,
    books,
    markResolved,
    removeBook,
    resolved,
    setBook,
  };
});
