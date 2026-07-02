import type { Ref } from 'vue';

import type {
  DataQualitySnapshot,
  EquitySnapshotView,
  LiveAccountView,
} from '@vben/types';

import { computed } from 'vue';

import Decimal from 'decimal.js';

import { parseDecimal } from '#/shared/components/format';
import { useSystemStore } from '#/store';

/** Dashboard KPI inputs aggregated from live account, equity, and system stores. */
export function useDashboardMetrics(
  liveAccount: Ref<LiveAccountView | null>,
  equity: Ref<EquitySnapshotView | null>,
  dataQuality: Ref<DataQualitySnapshot | null>,
) {
  const systemStore = useSystemStore();

  const netLiquidation = computed(
    () => liveAccount.value?.venue_net_liquidation_usd,
  );
  const available = computed(() => liveAccount.value?.available_usd);
  const budgetCap = computed(() => liveAccount.value?.budget_cap_usd);
  const reserved = computed(() => liveAccount.value?.reserved_usd);
  const capitalBase = computed(() => liveAccount.value?.capital_base_usd);
  const positionCount = computed(
    () => liveAccount.value?.positions.length ?? null,
  );

  const drawdownPct = computed(() => equity.value?.drawdown_pct);
  const drawdownAnimatorPct = computed(() => {
    const decimal = parseDecimal(drawdownPct.value);
    if (decimal === null) {
      return null;
    }
    return decimal.mul(100).toDecimalPlaces(1).toNumber();
  });
  const highWaterMark = computed(() => equity.value?.high_water_mark_usd);
  const unrealizedPnl = computed(() => equity.value?.unrealized_pnl_usd);
  const realizedPnl = computed(() => equity.value?.realized_pnl_cumulative_usd);

  const activeMarkets = computed(() => systemStore.status?.active_markets);
  const operationalPhase = computed(
    () => systemStore.status?.operational_phase.phase ?? null,
  );
  const catalogMarkets = computed(() => {
    const catalog = systemStore.status?.catalog;
    return catalog?.state === 'ready' ? catalog.markets : null;
  });

  const freshTokens = computed(() => dataQuality.value?.fresh ?? null);
  const staleTokens = computed(() => dataQuality.value?.stale ?? null);
  const totalTokens = computed(() => dataQuality.value?.total_tokens ?? null);

  const freshRatio = computed(() => {
    const total = totalTokens.value;
    const fresh = freshTokens.value;
    if (total === null || fresh === null || total === 0) {
      return null;
    }
    return new Decimal(fresh).div(total).toNumber();
  });

  return {
    activeMarkets,
    available,
    budgetCap,
    capitalBase,
    catalogMarkets,
    drawdownAnimatorPct,
    drawdownPct,
    freshRatio,
    freshTokens,
    highWaterMark,
    netLiquidation,
    operationalPhase,
    positionCount,
    realizedPnl,
    reserved,
    staleTokens,
    totalTokens,
    unrealizedPnl,
  };
}
