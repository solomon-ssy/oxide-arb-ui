<script lang="ts" setup>
import type { EquitySnapshotView, LiveAccountView } from '@vben/types';

import { computed } from 'vue';

import { Button, Empty } from 'antdv-next';

import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import {
  decimalSign,
  formatDateTimeLocal,
  formatPercent,
  formatUsd,
} from '#/shared/components/format';

defineOptions({ name: 'LiveAccountCard' });

const props = defineProps<{
  account: LiveAccountView | null;
  equity: EquitySnapshotView | null;
  loading: boolean;
}>();

const emit = defineEmits<{ navigate: [] }>();

const drawdownSign = computed(() =>
  props.equity ? decimalSign(props.equity.drawdown_pct) : null,
);
</script>

<template>
  <DashboardPanel
    :title="$t('page.dashboard.account.title')"
    icon="lucide:wallet"
    tone="teal"
    fill
  >
    <template #extra>
      <Button size="small" type="link" @click="emit('navigate')">
        {{ $t('page.dashboard.viewAll') }}
      </Button>
    </template>
    <div v-if="account" class="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
      <span class="text-muted-foreground">
        {{ $t('page.dashboard.account.netLiq') }}
      </span>
      <span class="text-right font-medium tabular-nums">
        {{ formatUsd(account.venue_net_liquidation_usd) }}
      </span>
      <span class="text-muted-foreground">
        {{ $t('page.dashboard.account.available') }}
      </span>
      <span class="text-right font-medium tabular-nums">
        {{ formatUsd(account.available_usd) }}
      </span>
      <span class="text-muted-foreground">
        {{ $t('page.dashboard.account.reserved') }}
      </span>
      <span class="text-right font-medium tabular-nums">
        {{ formatUsd(account.reserved_usd) }}
      </span>
      <span class="text-muted-foreground">
        {{ $t('page.dashboard.account.budgetCap') }}
      </span>
      <span class="text-right font-medium tabular-nums">
        {{ formatUsd(account.budget_cap_usd) }}
      </span>
      <template v-if="equity">
        <span class="text-muted-foreground">
          {{ $t('page.dashboard.account.drawdown') }}
        </span>
        <span
          :class="{
            'text-destructive': drawdownSign === -1,
          }"
          class="text-right font-medium tabular-nums"
        >
          {{ formatPercent(equity.drawdown_pct) }}
        </span>
      </template>
      <span class="text-muted-foreground">
        {{ $t('page.dashboard.account.checkedAt') }}
      </span>
      <span class="text-muted-foreground text-right text-xs tabular-nums">
        {{ formatDateTimeLocal(account.fetched_at) }}
      </span>
    </div>
    <Empty
      v-else-if="!loading"
      :description="$t('page.dashboard.account.unavailable')"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />
  </DashboardPanel>
</template>
