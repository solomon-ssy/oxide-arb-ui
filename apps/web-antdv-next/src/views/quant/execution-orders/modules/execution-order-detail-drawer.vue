<script lang="ts" setup>
import type { ExecutionOrderView } from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';
import { EXECUTION_ORDER_STATES } from '@vben/types';

import { Card, Descriptions, DescriptionsItem } from 'antdv-next';

import { getExecutionOrder } from '#/api/execution-orders';
import { $t } from '#/locales';
import AsyncState from '#/shared/components/async-state.vue';
import EntityDetailHeader from '#/shared/components/entity-detail-header.vue';
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
const loadError = ref<null | string>(null);
const openOrderId = ref<null | string>(null);

const notFound = computed(
  () => !order.value && !loading.value && !loadError.value,
);

const headerTags = computed(() => {
  const current = order.value;
  if (!current) {
    return [];
  }
  return [
    {
      color: findTagOption(stateTagOptions, current.state)?.color,
      label: findTagOption(stateTagOptions, current.state)?.label ?? '',
    },
    {
      color: findTagOption(phaseTagOptions, current.order_phase)?.color,
      label: findTagOption(phaseTagOptions, current.order_phase)?.label ?? '',
    },
    {
      color: findTagOption(sideTagOptions, current.side)?.color,
      label: findTagOption(sideTagOptions, current.side)?.label ?? '',
    },
  ];
});

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
  loadError.value = null;
  try {
    const fresh = await handleRequest(() => getExecutionOrder(id), {
      silent: true,
      onError: (err) => {
        if (err.httpStatus !== 404) {
          loadError.value = err.message;
        }
      },
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
      loadError.value = null;
      order.value = data.order;
      void refreshOrder(data.order.execution_order_id);
    } else {
      openOrderId.value = null;
      order.value = null;
      loadError.value = null;
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
    <AsyncState
      :error-message="loadError"
      :loading="loading && !order"
      :not-found="notFound"
      :not-found-text="$t('page.quantExecutionOrders.detail.notFound')"
      @retry="
        () => {
          const id = openOrderId;
          if (id) {
            void refreshOrder(id);
          }
        }
      "
    >
      <div v-if="order" class="flex flex-col gap-4">
        <EntityDetailHeader :id="order.execution_order_id" :tags="headerTags" />

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
    </AsyncState>
  </Drawer>
</template>
