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
  const systemBalance = computed(() => systemStore.balance);
  const exposure = computed(
    () =>
      systemBalance.value?.total_exposure_usd ??
      systemStore.status?.total_exposure,
  );
  const pendingReservations = computed(
    () =>
      systemBalance.value?.active_reservation_count ??
      systemStore.status?.pending_reservations,
  );
  const availableForSizing = computed(
    () => systemBalance.value?.available_for_sizing_usd,
  );
  const cashBalance = computed(() => systemBalance.value?.cash_balance_usd);
  const balanceSource = computed(() => systemBalance.value?.source);

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

  const blockingTradeCount = computed(
    () => systemStore.balance?.blocking_trade_count ?? 0,
  );
  const needsReconcileCount = computed(
    () => systemStore.balance?.needs_reconcile_count ?? 0,
  );
  const operationalPhase = computed(
    () => systemStore.status?.operational_phase.phase ?? null,
  );

  function applyMaxDailyLoss(limit: string | undefined) {
    maxDailyLossUsd.value = limit;
  }

  return {
    applyMaxDailyLoss,
    availableForSizing,
    balanceSource,
    blockingTradeCount,
    cashBalance,
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
    needsReconcileCount,
    operationalPhase,
    pendingReservations,
    totalPnl,
  };
}
