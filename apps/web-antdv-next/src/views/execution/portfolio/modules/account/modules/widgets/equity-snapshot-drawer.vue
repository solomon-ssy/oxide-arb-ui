<script lang="ts" setup>
import type { EquitySnapshotView } from '@vben/types';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Descriptions, DescriptionsItem } from 'antdv-next';

import { $t } from '#/locales';
import {
  EMPTY_PLACEHOLDER,
  formatDateTimeLocal,
  formatPercent,
  formatUsd,
} from '#/shared/components/format';
import WorkspaceInspectorSurface from '#/shared/components/workspace/workspace-inspector-surface.vue';

defineOptions({ name: 'EquitySnapshotDrawer' });

interface EquitySnapshotDrawerData {
  snapshot: EquitySnapshotView;
}

const snapshot = ref<EquitySnapshotView | null>(null);

const [, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    snapshot.value = isOpen
      ? drawerApi.getData<EquitySnapshotDrawerData>().snapshot
      : null;
  },
});
</script>

<template>
  <WorkspaceInspectorSurface
    :drawer-api="drawerApi"
    :title="$t('page.quantAccount.snapshotDetail.title')"
  >
    <Descriptions v-if="snapshot" :column="1" bordered size="small">
      <DescriptionsItem :label="$t('page.quantAccount.snapshotDetail.id')">
        <span class="font-mono text-xs">{{ snapshot.equity_snapshot_id }}</span>
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.quantAccount.fields.asOf')">
        {{ formatDateTimeLocal(snapshot.as_of) }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.quantAccount.fields.source')">
        {{ $t(`enum.accountSource.${snapshot.source}`) }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.quantAccount.fields.netLiq')">
        {{ formatUsd(snapshot.venue_net_liquidation_usd) }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.quantAccount.fields.capitalBase')">
        {{ formatUsd(snapshot.capital_base_usd) }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.quantAccount.fields.available')">
        {{ formatUsd(snapshot.available_usd) }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.quantAccount.fields.reserved')">
        {{ formatUsd(snapshot.reserved_usd) }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.quantAccount.fields.realizedPnl')">
        {{ formatUsd(snapshot.realized_pnl_cumulative_usd) }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.quantAccount.fields.incentiveCredit')">
        {{ formatUsd(snapshot.incentive_credit_cumulative_usd) }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.quantAccount.fields.unrealizedPnl')">
        {{ formatUsd(snapshot.unrealized_pnl_usd) }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.quantAccount.fields.highWaterMark')">
        {{ formatUsd(snapshot.high_water_mark_usd) }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.quantAccount.fields.drawdown')">
        {{ formatPercent(snapshot.drawdown_pct) }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.quantAccount.snapshotDetail.accountRef')"
      >
        <span class="font-mono text-xs">
          {{ snapshot.account_snapshot_ref ?? EMPTY_PLACEHOLDER }}
        </span>
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.quantAccount.fields.createdAt')">
        {{ formatDateTimeLocal(snapshot.created_at) }}
      </DescriptionsItem>
    </Descriptions>
  </WorkspaceInspectorSurface>
</template>
