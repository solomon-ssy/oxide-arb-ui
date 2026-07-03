<script lang="ts" setup>
import type { PositionView } from '@vben/types';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Card, Descriptions, DescriptionsItem, Spin, Tag } from 'antdv-next';

import { getPosition } from '#/api/positions';
import { $t } from '#/locales';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import {
  EMPTY_PLACEHOLDER,
  formatDateTimeLocal,
  formatPrice,
  formatShares,
  formatUsd,
} from '#/shared/components/format';
import {
  findTagOption,
  usePositionLedgerStateTagOptions,
} from '#/shared/components/format/tag-options';

defineOptions({ name: 'PositionDetailDrawer' });

interface PositionDrawerData {
  position: PositionView;
}

const { handleRequest } = useRequestHandler();

const position = ref<null | PositionView>(null);
const loading = ref(false);
const openPositionId = ref<null | string>(null);

const stateTagOptions = usePositionLedgerStateTagOptions();

async function refreshPosition(id: string) {
  loading.value = true;
  try {
    const fresh = await handleRequest(() => getPosition(id), { silent: true });
    if (openPositionId.value === id) {
      position.value = fresh ?? null;
    }
  } finally {
    loading.value = false;
  }
}

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<PositionDrawerData>();
      openPositionId.value = data.position.position_id;
      position.value = data.position;
      void refreshPosition(data.position.position_id);
    } else {
      openPositionId.value = null;
      position.value = null;
    }
  },
});
</script>

<template>
  <Drawer
    :title="$t('page.quantPositions.detail.title')"
    class="w-full max-w-3xl"
  >
    <Spin :spinning="loading">
      <div v-if="position" class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <Tag :color="findTagOption(stateTagOptions, position.state)?.color">
            {{ findTagOption(stateTagOptions, position.state)?.label }}
          </Tag>
          <Tag color="default">{{ position.position_plane }}</Tag>
        </div>

        <Card
          size="small"
          :title="$t('page.quantPositions.detail.sections.lot')"
        >
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.quantPositions.columns.positionId')"
            >
              <span class="font-mono text-xs break-all">
                {{ position.position_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantPositions.detail.orderIntentId')"
            >
              <EntityRouteLink
                mono
                :label="position.order_intent_id"
                :to="`/quant/intents/${position.order_intent_id}`"
              />
            </DescriptionsItem>
            <DescriptionsItem :label="$t('page.quantPositions.columns.market')">
              <EntityRouteLink
                mono
                :label="position.market_id"
                :to="`/markets/${position.market_id}`"
              />
            </DescriptionsItem>
            <DescriptionsItem :label="$t('page.quantPositions.detail.token')">
              <span class="font-mono text-xs break-all">
                {{ position.token_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem :label="$t('page.quantPositions.columns.shares')">
              <span class="font-mono">{{ formatShares(position.shares) }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantPositions.columns.avgPrice')"
            >
              <span class="font-mono">{{
                formatPrice(position.avg_price)
              }}</span>
            </DescriptionsItem>
            <DescriptionsItem :label="$t('page.quantPositions.columns.cost')">
              <span class="font-mono">{{ formatUsd(position.cost_usd) }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantPositions.columns.realizedPnl')"
            >
              <span class="font-mono">
                {{ formatUsd(position.realized_pnl_usd) }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantPositions.columns.openedAt')"
            >
              {{ formatDateTimeLocal(position.opened_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantPositions.columns.closedAt')"
            >
              {{ formatDateTimeLocal(position.closed_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantPositions.detail.updatedAt')"
            >
              {{ formatDateTimeLocal(position.updated_at) }}
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <div class="flex flex-col gap-1">
          <EntityRouteLink
            :label="$t('page.quantPositions.detail.viewOrders')"
            :to="`/quant/execution-orders?order_intent_id=${position.order_intent_id}`"
          />
          <EntityRouteLink
            :label="$t('page.quantPositions.detail.viewAttribution')"
            :to="`/quant/recommendations/${position.recommendation_id}?tab=attribution`"
          />
        </div>
      </div>
      <span v-else class="text-gray-500">{{ EMPTY_PLACEHOLDER }}</span>
    </Spin>
  </Drawer>
</template>
