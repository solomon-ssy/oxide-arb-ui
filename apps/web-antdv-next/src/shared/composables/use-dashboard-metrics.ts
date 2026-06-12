import { computed, ref } from 'vue';

import Decimal from 'decimal.js';

import { parseDecimal } from '#/shared/components/format';
import { usePnlStore, useRiskStore, useSystemStore } from '#/store';

/** Dashboard KPI inputs aggregated from the live WS-backed domain stores. */
export function useDashboardMetrics() {
  const pnlStore = usePnlStore();
  const systemStore = useSystemStore();
  const riskStore = useRiskStore();

  /** Active runtime-config daily loss cap; set by the dashboard on mount. */
  const maxDailyLossUsd = ref<string | undefined>();

  const dailyPnl = computed(() => pnlStore.live?.daily_pnl);
  const totalPnl = computed(() => pnlStore.live?.total_realized_pnl);
  const exposure = computed(() => systemStore.status?.total_exposure);
  const pendingReservations = computed(
    () => systemStore.status?.pending_reservations,
  );

  const dailyLossUsd = computed(
    () => riskStore.breaker?.daily_loss_usd ?? pnlStore.live?.daily_loss_usd,
  );

  const dailyLossRemainingUsd = computed(() => {
    const used = parseDecimal(dailyLossUsd.value);
    const max = parseDecimal(maxDailyLossUsd.value);
    if (used === null || max === null) {
      return undefined;
    }
    return max.sub(used).toFixed(2);
  });

  const dailyLossUtilization = computed(() => {
    const used = parseDecimal(dailyLossUsd.value);
    const max = parseDecimal(maxDailyLossUsd.value);
    if (used === null || max === null || max.isZero()) {
      return null;
    }
    return used.div(max).toNumber();
  });

  const dailyTradeCount = computed(() => riskStore.breaker?.daily_trade_count);
  const dailySuccessCount = computed(
    () => riskStore.breaker?.daily_success_count,
  );
  const dailyMissCount = computed(() => riskStore.breaker?.daily_miss_count);

  const dailyHitRate = computed(() => {
    const total = dailyTradeCount.value;
    const success = dailySuccessCount.value;
    if (total === undefined || success === undefined || total === 0) {
      return null;
    }
    return new Decimal(success).div(total).toNumber();
  });

  function applyMaxDailyLoss(limit: string | undefined) {
    maxDailyLossUsd.value = limit;
  }

  return {
    applyMaxDailyLoss,
    dailyHitRate,
    dailyLossRemainingUsd,
    dailyLossUsd,
    dailyLossUtilization,
    dailyMissCount,
    dailyPnl,
    dailySuccessCount,
    dailyTradeCount,
    exposure,
    maxDailyLossUsd,
    pendingReservations,
    totalPnl,
  };
}
