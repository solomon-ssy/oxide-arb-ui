<script lang="ts" setup>
import type {
  SettlementRedeemDetailView,
  SettlementRedeemView,
} from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Card, Descriptions, DescriptionsItem, Empty, Table } from 'antdv-next';

import { getSettlementRedeem } from '#/api/settlement-redeems';
import { $t } from '#/locales';
import AsyncState from '#/shared/components/async-state.vue';
import EntityDetailHeader from '#/shared/components/entity-detail-header.vue';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import {
  EMPTY_PLACEHOLDER,
  formatDateTimeLocal,
  formatShares,
  formatUsd,
} from '#/shared/components/format';
import {
  findTagOption,
  useSettlementRedeemStateTagOptions,
} from '#/shared/components/format/tag-options';
import { useDrawerSettlementRevisionRefresh } from '#/shared/composables/use-drawer-settlement-revision-refresh';
import { positionOpenPath } from '#/shared/routes/execution-plane';

defineOptions({ name: 'SettlementRedeemDetailDrawer' });

interface SettlementRedeemDrawerData {
  redeem: SettlementRedeemView;
}

const { handleRequest } = useRequestHandler();
const stateTagOptions = useSettlementRedeemStateTagOptions();

const seed = ref<null | SettlementRedeemView>(null);
const detail = ref<null | SettlementRedeemDetailView>(null);
const loading = ref(false);
const loadError = ref<null | string>(null);
const openId = ref<null | string>(null);

const header = computed<null | SettlementRedeemView>(
  () => detail.value ?? seed.value,
);
const lots = computed(() => detail.value?.lots ?? []);

const notFound = computed(
  () => !header.value && !loading.value && !loadError.value,
);

const headerTags = computed(() => {
  const current = header.value;
  if (!current) {
    return [];
  }
  const option = findTagOption(stateTagOptions, current.state);
  return [{ color: option?.color, label: option?.label ?? current.state }];
});

const lotColumns = [
  {
    dataIndex: 'token_id',
    key: 'token_id',
    title: $t('page.quantSettlementRedeems.lots.token'),
  },
  {
    dataIndex: 'shares_redeemed',
    key: 'shares_redeemed',
    title: $t('page.quantSettlementRedeems.lots.shares'),
  },
  {
    dataIndex: 'cost_basis_usd',
    key: 'cost_basis_usd',
    title: $t('page.quantSettlementRedeems.lots.costBasis'),
  },
  {
    dataIndex: 'payout_usd',
    key: 'payout_usd',
    title: $t('page.quantSettlementRedeems.lots.payout'),
  },
  {
    dataIndex: 'realized_pnl_usd',
    key: 'realized_pnl_usd',
    title: $t('page.quantSettlementRedeems.lots.realizedPnl'),
  },
  {
    dataIndex: 'position_id',
    key: 'position_id',
    title: $t('page.quantSettlementRedeems.lots.position'),
  },
  {
    dataIndex: 'order_intent_id',
    key: 'order_intent_id',
    title: $t('page.quantSettlementRedeems.lots.intent'),
  },
];

async function refreshDetail(id: string) {
  loading.value = true;
  loadError.value = null;
  try {
    const fresh = await handleRequest(() => getSettlementRedeem(id), {
      silent: true,
      onError: (err) => {
        if (err.httpStatus !== 404) {
          loadError.value = err.message;
        }
      },
    });
    if (openId.value === id) {
      detail.value = fresh ?? null;
    }
  } finally {
    loading.value = false;
  }
}

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<SettlementRedeemDrawerData>();
      openId.value = data.redeem.settlement_redeem_id;
      loadError.value = null;
      seed.value = data.redeem;
      detail.value = null;
      void refreshDetail(data.redeem.settlement_redeem_id);
    } else {
      openId.value = null;
      seed.value = null;
      detail.value = null;
      loadError.value = null;
    }
  },
});

useDrawerSettlementRevisionRefresh(openId, refreshDetail);
</script>

<template>
  <Drawer
    :title="$t('page.quantSettlementRedeems.detail.title')"
    class="w-full max-w-4xl"
  >
    <AsyncState
      :error-message="loadError"
      :loading="loading && !header"
      :not-found="notFound"
      :not-found-text="$t('page.quantSettlementRedeems.detail.notFound')"
      @retry="
        () => {
          const id = openId;
          if (id) {
            void refreshDetail(id);
          }
        }
      "
    >
      <div v-if="header" class="flex flex-col gap-4">
        <EntityDetailHeader
          :id="header.settlement_redeem_id"
          :tags="headerTags"
        />

        <Card
          size="small"
          :title="$t('page.quantSettlementRedeems.detail.sections.batch')"
        >
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.columns.batchId')"
            >
              <span class="font-mono text-xs break-all">
                {{ header.settlement_redeem_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.columns.market')"
            >
              <EntityRouteLink
                mono
                :label="header.market_id"
                :to="`/markets/${header.market_id}`"
              />
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.detail.funder')"
            >
              <span class="font-mono text-xs break-all">
                {{ header.funder_address }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.detail.walletKind')"
            >
              {{ header.wallet_kind }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.columns.payout')"
            >
              <span class="font-mono">{{ formatUsd(header.payout_usd) }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.detail.gasFee')"
            >
              <span class="font-mono">
                {{ header.gas_fee_pol ?? EMPTY_PLACEHOLDER }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.columns.txHash')"
            >
              <span class="font-mono text-xs break-all">
                {{ header.tx_hash ?? EMPTY_PLACEHOLDER }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.columns.attempts')"
            >
              {{ header.attempt_count }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.detail.nextAttemptAt')"
            >
              {{ formatDateTimeLocal(header.next_attempt_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.columns.submittedAt')"
            >
              {{ formatDateTimeLocal(header.submitted_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.columns.confirmedAt')"
            >
              {{ formatDateTimeLocal(header.confirmed_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.detail.failedAt')"
            >
              {{ formatDateTimeLocal(header.failed_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.detail.lastError')"
            >
              <span class="text-destructive">
                {{ header.last_error ?? EMPTY_PLACEHOLDER }}
              </span>
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card
          size="small"
          :title="$t('page.quantSettlementRedeems.detail.sections.lots')"
        >
          <Table
            v-if="lots.length > 0"
            :columns="lotColumns"
            :data-source="lots"
            :pagination="false"
            row-key="settlement_redeem_lot_id"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'token_id'">
                <span class="font-mono text-xs break-all">
                  {{ record.token_id }}
                </span>
              </template>
              <template v-else-if="column.key === 'shares_redeemed'">
                <span class="font-mono">
                  {{ formatShares(record.shares_redeemed) }}
                </span>
              </template>
              <template v-else-if="column.key === 'cost_basis_usd'">
                <span class="font-mono">{{
                  formatUsd(record.cost_basis_usd)
                }}</span>
              </template>
              <template v-else-if="column.key === 'payout_usd'">
                <span class="font-mono">{{
                  formatUsd(record.payout_usd)
                }}</span>
              </template>
              <template v-else-if="column.key === 'realized_pnl_usd'">
                <span class="font-mono">
                  {{ formatUsd(record.realized_pnl_usd) }}
                </span>
              </template>
              <template v-else-if="column.key === 'position_id'">
                <EntityRouteLink
                  mono
                  :label="record.position_id"
                  :to="positionOpenPath(record.position_id)"
                />
              </template>
              <template v-else-if="column.key === 'order_intent_id'">
                <EntityRouteLink
                  mono
                  :label="record.order_intent_id"
                  :to="`/quant/intents/${record.order_intent_id}`"
                />
              </template>
            </template>
          </Table>
          <Empty
            v-else
            :description="$t('page.quantSettlementRedeems.detail.noLots')"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </Card>
      </div>
    </AsyncState>
  </Drawer>
</template>
