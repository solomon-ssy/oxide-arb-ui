<script lang="ts" setup>
import type {
  DataQualitySnapshot,
  EquitySnapshotView,
  LiveAccountView,
} from '@vben/types';

import type { KpiAccent } from '#/shared/components/dashboard-accent';

import { computed, toRef } from 'vue';

import { $t } from '#/locales';
import {
  decimalSign,
  formatPercent,
  formatUsd,
  toAnimatorNumber,
} from '#/shared/components/format';
import KpiStatCard from '#/shared/components/kpi-stat-card.vue';
import { useDashboardMetrics } from '#/shared/composables/use-dashboard-metrics';
import { useQpAccess } from '#/shared/composables/use-qp-access';

defineOptions({ name: 'DashboardKpiCards' });

const props = defineProps<{
  accountLoading: boolean;
  dataQuality: DataQualitySnapshot | null;
  equity: EquitySnapshotView | null;
  liveAccount: LiveAccountView | null;
}>();

type KpiPermission = 'account' | 'equity' | 'system';

interface KpiCardConfig {
  accent: KpiAccent;
  decimals?: number;
  endVal?: null | number;
  icon: string;
  permission: KpiPermission;
  prefix?: string;
  sign?: ReturnType<typeof decimalSign>;
  suffix?: string;
  titleKey: string;
  tooltipKey?: string;
}

const { hasAccessByCodes } = useQpAccess();

const canReadAccount = computed(() =>
  hasAccessByCodes(['account_snapshot:read']),
);
const canReadEquity = computed(() =>
  hasAccessByCodes(['equity_snapshot:read']),
);
const canReadSystem = computed(() => hasAccessByCodes(['system:read']));

const metrics = useDashboardMetrics(
  toRef(props, 'liveAccount'),
  toRef(props, 'equity'),
  toRef(props, 'dataQuality'),
);

const drawdownSign = computed(() => decimalSign(metrics.drawdownPct.value));

const cards = computed<KpiCardConfig[]>(() => [
  {
    accent: 'emerald',
    decimals: 2,
    endVal: toAnimatorNumber(metrics.netLiquidation.value),
    icon: 'lucide:landmark',
    permission: 'account',
    prefix: '$',
    titleKey: 'page.dashboard.kpi.netLiq',
    tooltipKey: 'page.dashboard.kpi.netLiqTip',
  },
  {
    accent: 'sky',
    decimals: 2,
    endVal: toAnimatorNumber(metrics.available.value),
    icon: 'lucide:wallet',
    permission: 'account',
    prefix: '$',
    titleKey: 'page.dashboard.kpi.available',
    tooltipKey: 'page.dashboard.kpi.availableTip',
  },
  {
    accent: 'amber',
    decimals: 1,
    endVal: metrics.drawdownAnimatorPct.value,
    icon: 'lucide:trending-down',
    permission: 'equity',
    sign: drawdownSign.value,
    suffix: '%',
    titleKey: 'page.dashboard.kpi.drawdown',
    tooltipKey: 'page.dashboard.kpi.drawdownTip',
  },
  {
    accent: 'violet',
    endVal: metrics.activeMarkets.value ?? null,
    icon: 'lucide:activity',
    permission: 'system',
    titleKey: 'page.dashboard.kpi.activeMarkets',
    tooltipKey: 'page.dashboard.kpi.activeMarketsTip',
  },
]);

const visibleCards = computed(() =>
  cards.value.filter((card) => {
    if (card.permission === 'account') {
      return canReadAccount.value;
    }
    if (card.permission === 'equity') {
      return canReadEquity.value;
    }
    return canReadSystem.value;
  }),
);

function cardLoading(card: KpiCardConfig) {
  if (card.permission === 'account' || card.permission === 'equity') {
    return props.accountLoading;
  }
  return false;
}
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <KpiStatCard
      v-for="card in visibleCards"
      :key="card.titleKey"
      :accent="card.accent"
      :decimals="card.decimals"
      :end-val="card.endVal ?? null"
      :icon="card.icon"
      :loading="cardLoading(card)"
      :prefix="card.prefix"
      :sign="card.sign"
      :suffix="card.suffix"
      :title="$t(card.titleKey)"
      :tooltip="card.tooltipKey ? $t(card.tooltipKey) : undefined"
    >
      <template v-if="card.titleKey === 'page.dashboard.kpi.netLiq'" #footer>
        <span>{{ $t('page.dashboard.kpi.budgetCap') }}</span>
        <span class="font-medium">
          {{ formatUsd(metrics.budgetCap.value) }}
        </span>
        <span class="mx-1">·</span>
        <span>{{ $t('page.dashboard.kpi.reserved') }}</span>
        <span class="font-medium">
          {{ formatUsd(metrics.reserved.value) }}
        </span>
      </template>

      <template
        v-else-if="card.titleKey === 'page.dashboard.kpi.available'"
        #footer
      >
        <span>{{ $t('page.dashboard.kpi.capitalBase') }}</span>
        <span class="font-medium">
          {{ formatUsd(metrics.capitalBase.value) }}
        </span>
        <span class="mx-1">·</span>
        {{
          $t('page.dashboard.kpi.positions', {
            count: metrics.positionCount.value ?? '—',
          })
        }}
      </template>

      <template
        v-else-if="card.titleKey === 'page.dashboard.kpi.drawdown'"
        #footer
      >
        <template v-if="equity">
          <span>{{ $t('page.dashboard.kpi.highWaterMark') }}</span>
          <span class="font-medium">
            {{ formatUsd(metrics.highWaterMark.value) }}
          </span>
          <span class="mx-1">·</span>
          <span>{{ $t('page.dashboard.kpi.unrealizedPnl') }}</span>
          <span class="font-medium">
            {{ formatUsd(metrics.unrealizedPnl.value) }}
          </span>
        </template>
        <span v-else>{{ $t('page.dashboard.kpi.noEquitySnapshot') }}</span>
      </template>

      <template
        v-else-if="card.titleKey === 'page.dashboard.kpi.activeMarkets'"
        #footer
      >
        <span v-if="metrics.operationalPhase.value">
          {{ $t(`page.system.phase.${metrics.operationalPhase.value}`) }}
        </span>
        <template v-if="metrics.catalogMarkets.value !== null">
          <span class="mx-1">·</span>
          {{
            $t('page.dashboard.kpi.catalogMarkets', {
              count: metrics.catalogMarkets.value,
            })
          }}
        </template>
        <template v-if="metrics.totalTokens.value !== null">
          <span class="mx-1">·</span>
          {{
            $t('page.dashboard.kpi.dataUsable', {
              usable: metrics.usableTokens.value ?? '—',
              total: metrics.totalTokens.value,
            })
          }}
        </template>
        <template v-if="metrics.usableRatio.value !== null">
          <span class="mx-1">·</span>
          <span class="font-medium">
            {{ formatPercent(String(metrics.usableRatio.value)) }}
          </span>
        </template>
      </template>
    </KpiStatCard>
  </div>
</template>
