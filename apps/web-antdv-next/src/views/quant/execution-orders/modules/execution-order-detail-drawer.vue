<script lang="ts" setup>
import type { ExecutionOrderView } from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';
import { EXECUTION_ORDER_STATES } from '@vben/types';

import { Card, Descriptions, DescriptionsItem, Spin, Tag } from 'antdv-next';

import { getExecutionOrder } from '#/api/execution-orders';
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
  useExecutionOrderPhaseTagOptions,
  useExecutionOrderStateTagOptions,
  useSideTagOptions,
} from '#/shared/components/format/tag-options';
import { useDrawerIntentRevisionRefresh } from '#/shared/composables/use-drawer-intent-revision-refresh';
import { reconciliationQueuePath } from '#/shared/routes/execution-plane';

defineOptions({ name: 'ExecutionOrderDetailDrawer' });

interface ExecutionOrderDrawerData {
  order: ExecutionOrderView;
}

const { handleRequest } = useRequestHandler();

const order = ref<ExecutionOrderView | null>(null);
const loading = ref(false);
const openOrderId = ref<null | string>(null);

const stateTagOptions = useExecutionOrderStateTagOptions();
const phaseTagOptions = useExecutionOrderPhaseTagOptions();
const sideTagOptions = useSideTagOptions();

const showReconciliationLink = computed(() => {
  const current = order.value;
  if (!current) {
    return false;
  }
  return (
    !!current.error_message ||
    current.state === EXECUTION_ORDER_STATES.failed ||
    current.state === EXECUTION_ORDER_STATES.ambiguous
  );
});

const reconciliationLink = computed(() => {
  const current = order.value;
  if (!current) {
    return '/quant/reconciliations';
  }
  return reconciliationQueuePath({
    execution_order_id: current.execution_order_id,
    order_intent_id: current.order_intent_id,
  });
});

async function refreshOrder(id: string) {
  loading.value = true;
  try {
    const fresh = await handleRequest(() => getExecutionOrder(id), {
      silent: true,
    });
    if (openOrderId.value === id) {
      order.value = fresh ?? null;
    }
  } finally {
    loading.value = false;
  }
}

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<ExecutionOrderDrawerData>();
      openOrderId.value = data.order.execution_order_id;
      order.value = data.order;
      void refreshOrder(data.order.execution_order_id);
    } else {
      openOrderId.value = null;
      order.value = null;
    }
  },
});

useDrawerIntentRevisionRefresh(openOrderId, refreshOrder);
</script>

<template>
  <Drawer
    :title="$t('page.quantExecutionOrders.detail.title')"
    class="w-full max-w-3xl"
  >
    <Spin :spinning="loading">
      <div v-if="order" class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <Tag :color="findTagOption(stateTagOptions, order.state)?.color">
            {{ findTagOption(stateTagOptions, order.state)?.label }}
          </Tag>
          <Tag
            :color="findTagOption(phaseTagOptions, order.order_phase)?.color"
          >
            {{ findTagOption(phaseTagOptions, order.order_phase)?.label }}
          </Tag>
          <Tag :color="findTagOption(sideTagOptions, order.side)?.color">
            {{ findTagOption(sideTagOptions, order.side)?.label }}
          </Tag>
        </div>

        <Card
          size="small"
          :title="$t('page.quantExecutionOrders.detail.sections.order')"
        >
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.quantExecutionOrders.columns.executionOrderId')"
            >
              <span class="font-mono text-xs break-all">
                {{ order.execution_order_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantExecutionOrders.columns.orderIntentId')"
            >
              <EntityRouteLink
                mono
                :label="order.order_intent_id"
                :to="`/quant/intents/${order.order_intent_id}`"
              />
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantExecutionOrders.columns.market')"
            >
              <EntityRouteLink
                mono
                :label="order.market_id"
                :to="`/markets/${order.market_id}`"
              />
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantExecutionOrders.columns.token')"
            >
              <span class="font-mono text-xs break-all">
                {{ order.token_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantExecutionOrders.columns.type')"
            >
              {{ $t(`enum.orderTypeKind.${order.order_type}`) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantExecutionOrders.columns.price')"
            >
              <span class="font-mono">{{ formatPrice(order.price) }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantExecutionOrders.columns.shares')"
            >
              <span class="font-mono">{{ formatShares(order.shares) }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantExecutionOrders.columns.cost')"
            >
              <span class="font-mono">{{ formatUsd(order.cost_usd) }}</span>
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card
          size="small"
          :title="$t('page.quantExecutionOrders.detail.sections.venue')"
        >
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.quantExecutionOrders.columns.venueOrderId')"
            >
              <span class="font-mono text-xs break-all">
                {{ order.venue_order_id ?? EMPTY_PLACEHOLDER }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantExecutionOrders.columns.venueStatus')"
            >
              {{
                order.venue_status
                  ? $t(`enum.venueOrderStatus.${order.venue_status}`)
                  : EMPTY_PLACEHOLDER
              }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantExecutionOrders.columns.submittedAt')"
            >
              {{ formatDateTimeLocal(order.submitted_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantExecutionOrders.columns.filledAt')"
            >
              {{ formatDateTimeLocal(order.filled_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantExecutionOrders.columns.cancelledAt')"
            >
              {{ formatDateTimeLocal(order.cancelled_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantExecutionOrders.detail.gtdExpiration')"
            >
              {{ formatDateTimeLocal(order.gtd_expiration_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantExecutionOrders.detail.error')"
            >
              <span class="text-destructive">
                {{ order.error_message ?? EMPTY_PLACEHOLDER }}
              </span>
            </DescriptionsItem>
          </Descriptions>
          <EntityRouteLink
            v-if="showReconciliationLink"
            class="mt-3"
            :label="$t('page.quantExecutionOrders.detail.viewReconciliation')"
            :to="reconciliationLink"
          />
        </Card>
      </div>
    </Spin>
  </Drawer>
</template>
