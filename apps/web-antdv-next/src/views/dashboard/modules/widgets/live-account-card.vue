<script lang="ts" setup>
import type { EquitySnapshotView, LiveAccountView } from '@vben/types';

import type { KeyValueGridItem } from '#/shared/components/key-value-grid.vue';

import { computed } from 'vue';

import { Button, Empty, Skeleton } from 'antdv-next';

import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import {
  decimalSign,
  formatDateTimeLocal,
  formatPercent,
  formatUsd,
} from '#/shared/components/format';
import KeyValueGrid from '#/shared/components/key-value-grid.vue';
import SignedValue from '#/shared/components/signed-value.vue';

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

const accountItems = computed<KeyValueGridItem[]>(() => {
  const account = props.account;
  if (!account) {
    return [];
  }
  const items: KeyValueGridItem[] = [
    {
      key: 'netLiq',
      label: $t('page.dashboard.account.netLiq'),
      value: formatUsd(account.venue_net_liquidation_usd),
    },
    {
      key: 'available',
      label: $t('page.dashboard.account.available'),
      value: formatUsd(account.available_usd),
    },
    {
      key: 'reserved',
      label: $t('page.dashboard.account.reserved'),
      value: formatUsd(account.reserved_usd),
    },
    {
      key: 'budgetCap',
      label: $t('page.dashboard.account.budgetCap'),
      value: formatUsd(account.budget_cap_usd),
    },
  ];
  if (props.equity) {
    items.push({
      key: 'drawdown',
      label: $t('page.dashboard.account.drawdown'),
      value: formatPercent(props.equity.drawdown_pct),
    });
  }
  items.push({
    key: 'checkedAt',
    label: $t('page.dashboard.account.checkedAt'),
    value: formatDateTimeLocal(account.fetched_at),
  });
  return items;
});
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
    <Skeleton v-if="loading && !account" :paragraph="{ rows: 4 }" active />
    <KeyValueGrid v-else-if="account" :bordered="false" :items="accountItems">
      <template #drawdown="{ item }">
        <SignedValue :sign="drawdownSign" :value="item.value ?? ''" />
      </template>
    </KeyValueGrid>
    <Empty
      v-else-if="!loading"
      :description="$t('page.dashboard.account.unavailable')"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />
  </DashboardPanel>
</template>
