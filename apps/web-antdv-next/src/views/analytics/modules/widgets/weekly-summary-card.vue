<script lang="ts" setup>
import type { WeeklyReport } from '@vben/types';

import { computed } from 'vue';

import { Alert, Empty, Skeleton } from 'antdv-next';
import Decimal from 'decimal.js';

import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import { formatPercent, formatUsd } from '#/shared/components/format';

defineOptions({ name: 'AnalyticsWeeklySummaryCard' });

const props = withDefaults(
  defineProps<{
    error?: null | string;
    loading?: boolean;
    report: null | WeeklyReport;
  }>(),
  { error: null, loading: false },
);

const winRate = computed(() => {
  const tradeCount = props.report?.execution.trade_count ?? 0;
  if (tradeCount === 0) {
    return '0';
  }
  return new Decimal(props.report?.execution.success_count ?? 0)
    .div(tradeCount)
    .toString();
});
</script>

<template>
  <DashboardPanel
    icon="lucide:calendar-range"
    :title="$t('page.analytics.weekly.title')"
    tone="sky"
  >
    <Skeleton v-if="loading" :paragraph="{ rows: 2 }" active />
    <div
      v-else-if="error"
      class="flex min-h-24 items-center justify-center px-4"
    >
      <Alert show-icon type="error" :message="error" />
    </div>
    <div v-else-if="!report" class="flex min-h-24 items-center justify-center">
      <Empty :image="Empty.PRESENTED_IMAGE_SIMPLE" />
    </div>
    <div v-else class="grid gap-4 md:grid-cols-4">
      <div>
        <div class="text-muted-foreground text-xs">
          {{ $t('page.analytics.weekly.period') }}
        </div>
        <div class="font-mono text-sm font-semibold">
          {{ report.week_start }} / {{ report.week_end }}
        </div>
      </div>
      <div>
        <div class="text-muted-foreground text-xs">
          {{ $t('page.analytics.weekly.realizedPnl') }}
        </div>
        <div class="font-mono text-sm font-semibold">
          {{ formatUsd(report.settled_pnl.realized_pnl) }}
        </div>
      </div>
      <div>
        <div class="text-muted-foreground text-xs">
          {{ $t('page.analytics.weekly.winRate') }}
        </div>
        <div class="font-mono text-sm font-semibold">
          {{ formatPercent(winRate, 1) }}
        </div>
      </div>
      <div>
        <div class="text-muted-foreground text-xs">
          {{ $t('page.analytics.weekly.trades') }}
        </div>
        <div class="font-mono text-sm font-semibold">
          {{ report.execution.trade_count }}
        </div>
      </div>
    </div>
  </DashboardPanel>
</template>
