<script lang="ts" setup>
import type { KpiAccent } from '#/shared/components/dashboard-accent';

import { computed, onMounted, ref } from 'vue';

import { useRequestHandler } from '@vben/request/oxide';

import { getLivePnl } from '#/api/pnl';
import { getCircuitBreaker } from '#/api/risk';
import { getCurrentRuntimeConfig } from '#/api/runtime-config';
import { getSystemBalance, getSystemStatus } from '#/api/system';
import { $t } from '#/locales';
import {
  decimalSign,
  formatPercent,
  formatUsd,
  toAnimatorNumber,
} from '#/shared/components/format';
import KpiStatCard from '#/shared/components/kpi-stat-card.vue';
import { useDashboardMetrics } from '#/shared/composables/use-dashboard-metrics';
import { useOxideAccess } from '#/shared/composables/use-oxide-access';
import { usePnlStore, useRiskStore, useSystemStore } from '#/store';

defineOptions({ name: 'DashboardKpiCards' });

type KpiPermission = 'pnl' | 'risk' | 'system';

interface KpiCardConfig {
  accent: KpiAccent;
  decimals?: number;
  endVal?: null | number;
  icon: string;
  permission: KpiPermission;
  prefix?: string;
  sign?: ReturnType<typeof decimalSign>;
  titleKey: string;
  tooltipKey?: string;
}

const pnlStore = usePnlStore();
const systemStore = useSystemStore();
const riskStore = useRiskStore();
const metrics = useDashboardMetrics();
const { hasAccessByCodes } = useOxideAccess();
const { handleRequest } = useRequestHandler();

const canReadPnl = computed(() => hasAccessByCodes(['pnl:read']));
const canReadSystem = computed(() => hasAccessByCodes(['system:read']));
const canReadRisk = computed(() => hasAccessByCodes(['risk:read']));
const canReadRuntimeConfig = computed(() =>
  hasAccessByCodes(['runtime_config:read']),
);

const loadingPnl = ref(false);
const loadingSystem = ref(false);
const loadingRisk = ref(false);

onMounted(async () => {
  const tasks: Promise<void>[] = [];

  if (canReadPnl.value) {
    loadingPnl.value = true;
    tasks.push(
      (async () => {
        try {
          await handleRequest(getLivePnl, (view) =>
            pnlStore.applyLiveSnapshot(view),
          );
        } finally {
          loadingPnl.value = false;
        }
      })(),
    );
  }

  if (canReadSystem.value) {
    loadingSystem.value = true;
    tasks.push(
      (async () => {
        try {
          await Promise.all([
            handleRequest(getSystemStatus, (status) =>
              systemStore.applySystemStatus(status),
            ),
            handleRequest(getSystemBalance, (balance) =>
              systemStore.applySystemBalance(balance),
            ),
          ]);
        } finally {
          loadingSystem.value = false;
        }
      })(),
    );
  }

  if (canReadRisk.value) {
    loadingRisk.value = true;
    tasks.push(
      (async () => {
        try {
          await handleRequest(getCircuitBreaker, (view) =>
            riskStore.applyBreaker(view),
          );
        } finally {
          loadingRisk.value = false;
        }
      })(),
    );
  }

  if (canReadRuntimeConfig.value) {
    tasks.push(
      handleRequest(getCurrentRuntimeConfig, (current) => {
        metrics.applyMaxDailyLoss(current.config.risk?.max_daily_loss_usd);
      }).then(() => undefined),
    );
  }

  await Promise.all(tasks);
});

const dailyLossHeadroomClass = computed(() => {
  const utilization = metrics.dailyLossUtilization.value;
  if (utilization === null) {
    return '';
  }
  if (utilization >= 0.9) {
    return 'text-rose-600 dark:text-rose-400';
  }
  if (utilization >= 0.7) {
    return 'text-amber-600 dark:text-amber-400';
  }
  return '';
});

const cards = computed<KpiCardConfig[]>(() => {
  const dailySign = decimalSign(metrics.dailyPnl.value);

  return [
    {
      accent: 'emerald',
      decimals: 2,
      endVal: toAnimatorNumber(metrics.dailyPnl.value),
      icon: 'lucide:trending-up',
      permission: 'pnl',
      prefix: '$',
      sign: dailySign,
      titleKey: 'page.dashboard.kpi.pnl',
    },
    {
      accent: 'sky',
      decimals: 2,
      endVal: toAnimatorNumber(metrics.exposure.value),
      icon: 'lucide:wallet',
      permission: 'system',
      prefix: '$',
      titleKey: 'page.dashboard.kpi.exposure',
      tooltipKey: 'page.dashboard.kpi.exposureTip',
    },
    {
      accent: 'amber',
      icon: 'lucide:shield-alert',
      permission: 'risk',
      titleKey: 'page.dashboard.kpi.dailyLossHeadroom',
      tooltipKey: 'page.dashboard.kpi.dailyLossTip',
    },
    {
      accent: 'violet',
      endVal: metrics.dailyTradeCount.value ?? null,
      icon: 'lucide:activity',
      permission: 'risk',
      titleKey: 'page.dashboard.kpi.execution',
    },
  ];
});

const visibleCards = computed(() =>
  cards.value.filter((card) => {
    if (card.permission === 'pnl') {
      return canReadPnl.value;
    }
    if (card.permission === 'system') {
      return canReadSystem.value;
    }
    return canReadRisk.value;
  }),
);

function cardLoading(card: KpiCardConfig) {
  if (card.permission === 'pnl') {
    return loadingPnl.value;
  }
  if (card.permission === 'system') {
    return loadingSystem.value;
  }
  return loadingRisk.value;
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
      :title="$t(card.titleKey)"
      :tooltip="card.tooltipKey ? $t(card.tooltipKey) : undefined"
    >
      <template
        v-if="card.titleKey === 'page.dashboard.kpi.dailyLossHeadroom'"
        #value
      >
        <span :class="dailyLossHeadroomClass">
          {{ formatUsd(metrics.dailyLossUsd.value) }}
        </span>
        <span class="text-muted-foreground mx-1.5 font-normal">/</span>
        <span>{{ formatUsd(metrics.maxDailyLossUsd.value) }}</span>
      </template>

      <template #footer>
        <template v-if="card.titleKey === 'page.dashboard.kpi.pnl'">
          <span>{{ $t('page.dashboard.kpi.totalPnlFooter') }}</span>
          <span class="font-medium text-emerald-700 dark:text-emerald-300">
            {{ formatUsd(metrics.totalPnl.value) }}
          </span>
        </template>

        <template v-else-if="card.titleKey === 'page.dashboard.kpi.exposure'">
          {{
            $t('page.dashboard.kpi.availableFunds', {
              value: formatUsd(metrics.availableBeforePotentialLoss.value),
            })
          }}
          <span class="mx-1">·</span>
          {{
            $t('page.dashboard.kpi.cashSource', {
              source: metrics.balanceSource.value
                ? $t(`enum.systemBalanceSource.${metrics.balanceSource.value}`)
                : '—',
              value: formatUsd(metrics.cashBalance.value),
            })
          }}
          <span class="mx-1">·</span>
          {{
            $t('page.dashboard.kpi.pendingReservations', {
              count: metrics.pendingReservations.value ?? '—',
            })
          }}
        </template>

        <template
          v-else-if="card.titleKey === 'page.dashboard.kpi.dailyLossHeadroom'"
        >
          <span>{{ $t('page.dashboard.kpi.remaining') }}</span>
          <span :class="dailyLossHeadroomClass" class="font-medium">
            {{ formatUsd(metrics.dailyLossRemainingUsd.value) }}
          </span>
        </template>

        <template v-else-if="card.titleKey === 'page.dashboard.kpi.execution'">
          <span class="text-emerald-600 dark:text-emerald-400">
            {{
              $t('page.dashboard.kpi.executionSuccess', {
                count: metrics.dailySuccessCount.value ?? '—',
              })
            }}
          </span>
          <span class="mx-1">·</span>
          <span class="text-rose-600 dark:text-rose-400">
            {{
              $t('page.dashboard.kpi.executionMiss', {
                count: metrics.dailyMissCount.value ?? '—',
              })
            }}
          </span>
          <span class="mx-1">·</span>
          <span class="font-medium text-violet-700 dark:text-violet-300">
            {{
              metrics.dailyHitRate.value === null
                ? '—'
                : formatPercent(String(metrics.dailyHitRate.value))
            }}
          </span>
        </template>
      </template>
    </KpiStatCard>
  </div>
</template>
