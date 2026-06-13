<script lang="ts" setup>
import type { OpportunityAuditView, TradeView, UuidString } from '@vben/types';

import { ref, watch } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/hooks';

import { Descriptions, DescriptionsItem, Tag } from 'antdv-next';

import { getOpportunityAudit } from '#/api/opportunities';
import { getTradeById } from '#/api/trades';
import { $t } from '#/locales';
import AuditTimeline from '#/shared/components/audit-timeline.vue';
import {
  formatDateTimeLocal,
  formatPrice,
  formatShares,
} from '#/shared/components/format';
import { useTradeStore } from '#/store';

import PnlAttribution from './pnl-attribution.vue';

defineOptions({ name: 'TradeDetailDrawer' });

const { handleRequest } = useRequestHandler();
const tradeStore = useTradeStore();

const trade = ref<null | TradeView>(null);
const auditItems = ref<OpportunityAuditView[]>([]);
const loading = ref(false);
const auditLoading = ref(false);

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const { tradeId } = drawerApi.getData<{ tradeId: UuidString }>();
      void load(tradeId);
    } else {
      trade.value = null;
      auditItems.value = [];
    }
  },
});

async function load(tradeId: UuidString) {
  loading.value = true;
  try {
    await handleRequest(
      () => getTradeById(tradeId),
      (view) => {
        trade.value = view;
      },
    );
  } finally {
    loading.value = false;
  }
  const opportunityId = trade.value?.opportunity_id;
  if (opportunityId) {
    auditLoading.value = true;
    try {
      await handleRequest(
        () => getOpportunityAudit(opportunityId),
        (rows) => {
          auditItems.value = rows;
        },
      );
    } finally {
      auditLoading.value = false;
    }
  }
}

// A `trade.settled` push while the drawer is open refreshes the snapshot.
watch(
  () => {
    const id = trade.value?.trade_id;
    return id
      ? tradeStore.recent.find((t) => t.trade_id === id)?.state
      : undefined;
  },
  (state, prev) => {
    if (state && prev && state !== prev && trade.value) {
      void load(trade.value.trade_id);
    }
  },
);
</script>

<template>
  <Drawer
    class="w-[640px]"
    :loading="loading"
    :title="$t('page.trades.detail.title')"
  >
    <div v-if="trade" class="flex flex-col gap-5">
      <PnlAttribution :trade="trade" />

      <Descriptions bordered :column="2" size="small">
        <DescriptionsItem :label="$t('page.trades.detail.tradeId')" :span="2">
          <span class="font-mono text-xs">{{ trade.trade_id }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.trades.columns.market')" :span="2">
          <span class="font-mono text-xs">{{ trade.market_id }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.trades.columns.side')">
          <Tag :color="trade.side === 'BUY' ? 'success' : 'error'">
            {{ $t(`enum.side.${trade.side}`) }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.trades.columns.state')">
          <Tag>{{ $t(`enum.tradeState.${trade.state}`) }}</Tag>
          <Tag v-if="trade.business_outcome">
            {{ $t(`enum.tradeOutcome.${trade.business_outcome}`) }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.trades.columns.shares')">
          {{ formatShares(trade.shares) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.trades.columns.price')">
          {{ formatPrice(trade.price) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.trades.columns.mode')">
          {{ $t(`enum.executionMode.${trade.execution_mode}`) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.trades.detail.latency')">
          {{ trade.latency_ms === null ? '—' : `${trade.latency_ms} ms` }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.trades.detail.orderId')">
          <span class="font-mono text-xs">{{ trade.order_id ?? '—' }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.trades.detail.txHash')">
          <span class="font-mono text-xs">{{ trade.tx_hash ?? '—' }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.trades.detail.submittedAt')">
          {{ formatDateTimeLocal(trade.submitted_at) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.trades.detail.confirmedAt')">
          {{ formatDateTimeLocal(trade.confirmed_at) }}
        </DescriptionsItem>
        <DescriptionsItem
          v-if="trade.error_message"
          :label="$t('page.trades.detail.error')"
          :span="2"
        >
          <span class="text-destructive">{{ trade.error_message }}</span>
        </DescriptionsItem>
      </Descriptions>

      <div>
        <div class="mb-2 text-sm font-semibold">
          {{ $t('page.trades.detail.decisionChain') }}
        </div>
        <AuditTimeline :items="auditItems" :loading="auditLoading" />
      </div>
    </div>
  </Drawer>
</template>
