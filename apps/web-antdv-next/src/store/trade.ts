import type { TradeSettledEvent, TradeState, TradeView } from '@vben/types';

import { ref } from 'vue';

import { defineStore } from 'pinia';

/** Ring-buffer capacity of the recent-trades list. */
const RECENT_CAP = 50;

/** Terminal trade state implied by a settlement outcome. */
const OUTCOME_STATE: Record<TradeSettledEvent['outcome'], TradeState> = {
  failed: 'failed',
  miss: 'missed',
  success: 'settled',
};

/**
 * Recent trades: REST first paint + WS `trade.filled` prepends and
 * `trade.settled` patches. Both REST and WS carry the same `TradeView`.
 */
export const useTradeStore = defineStore('oxide-trade', () => {
  const recent = ref<TradeView[]>([]);

  function prependTrade(trade: TradeView) {
    // Dedup on id (REST first paint and the WS push can overlap).
    const existing = recent.value.findIndex(
      (t) => t.trade_id === trade.trade_id,
    );
    if (existing !== -1) {
      recent.value.splice(existing, 1);
    }
    recent.value.unshift(trade);
    if (recent.value.length > RECENT_CAP) {
      recent.value.length = RECENT_CAP;
    }
  }

  function setRecent(trades: TradeView[]) {
    recent.value = trades.slice(0, RECENT_CAP);
  }

  function applySettlement(event: TradeSettledEvent) {
    const trade = recent.value.find((t) => t.trade_id === event.trade_id);
    if (!trade) {
      return;
    }
    trade.business_outcome = event.outcome;
    trade.net_profit_usd = event.pnl;
    trade.state = OUTCOME_STATE[event.outcome];
  }

  function $reset() {
    recent.value = [];
  }

  return {
    $reset,
    applySettlement,
    prependTrade,
    recent,
    setRecent,
  };
});
