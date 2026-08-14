<script lang="ts" setup>
import type { PositionDetailView, PositionView } from '@vben/types';

import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';

import { useVbenDrawer } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { useRequestHandler } from '@vben/request/qp';
import { POSITION_LEDGER_STATES } from '@vben/types';

import { Button, Card, Descriptions, DescriptionsItem } from 'antdv-next';

import { getPosition } from '#/api/positions';
import { $t } from '#/locales';
import AsyncState from '#/shared/components/async-state.vue';
import ExitMonitorCard from '#/shared/components/domain/execution/exit-monitor-card.vue';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import {
  formatDateTimeLocal,
  formatPrice,
  formatShares,
  formatUsd,
} from '#/shared/components/format';
import { ObjectInspectorHeader } from '#/shared/components/object-inspector';
import WorkspaceInspectorSurface from '#/shared/components/workspace/workspace-inspector-surface.vue';
import { useDrawerIntentRevisionRefresh } from '#/shared/composables/use-drawer-intent-revision-refresh';
import {
  reconciliationQueuePath,
  settlementRedeemsPath,
} from '#/shared/routes/execution-plane';

defineOptions({ name: 'PositionDetailDrawer' });

interface PositionDrawerData {
  position: PositionDetailView | PositionView;
}

const { handleRequest } = useRequestHandler();

const position = ref<null | PositionView>(null);
const exitMonitorObservation = ref<
  null | PositionDetailView['exit_monitor_observation']
>(null);
const loading = ref(false);
const loadError = ref<null | string>(null);
const openPositionId = ref<null | string>(null);

const notFound = computed(
  () => !position.value && !loading.value && !loadError.value,
);

const showLifecycleLinks = computed(() => {
  const state = position.value?.state;
  return (
    state === POSITION_LEDGER_STATES.closing ||
    state === POSITION_LEDGER_STATES.closed ||
    state === POSITION_LEDGER_STATES.settled
  );
});

const reconciliationLink = computed(() =>
  position.value
    ? reconciliationQueuePath({
        order_intent_id: position.value.order_intent_id,
      })
    : reconciliationQueuePath(),
);

const settlementLink = computed(() =>
  position.value
    ? settlementRedeemsPath({ market_id: position.value.market_id })
    : settlementRedeemsPath(),
);

async function refreshPosition(id: string) {
  loading.value = true;
  loadError.value = null;
  try {
    const fresh = await handleRequest(() => getPosition(id), {
      silent: true,
      onError: (err) => {
        if (err.httpStatus !== 404) {
          loadError.value = err.message;
        }
      },
    });
    if (openPositionId.value === id) {
      position.value = fresh?.position ?? null;
      exitMonitorObservation.value = fresh?.exit_monitor_observation ?? null;
    }
  } finally {
    loading.value = false;
  }
}

const [, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<PositionDrawerData>();
      const initial =
        'position' in data.position ? data.position.position : data.position;
      openPositionId.value = initial.position_id;
      loadError.value = null;
      position.value = initial;
      exitMonitorObservation.value =
        'position' in data.position
          ? data.position.exit_monitor_observation
          : null;
      void refreshPosition(initial.position_id);
    } else {
      openPositionId.value = null;
      position.value = null;
      exitMonitorObservation.value = null;
      loadError.value = null;
    }
  },
});

useDrawerIntentRevisionRefresh(openPositionId, refreshPosition);
</script>

<template>
  <WorkspaceInspectorSurface
    :drawer-api="drawerApi"
    :title="$t('page.quantPositions.detail.title')"
  >
    <AsyncState
      :error-message="loadError"
      :loading="loading && !position"
      :not-found="notFound"
      :not-found-text="$t('page.quantPositions.detail.notFound')"
      @retry="
        () => {
          const id = openPositionId;
          if (id) {
            void refreshPosition(id);
          }
        }
      "
    >
      <div
        v-if="position"
        class="flex flex-col gap-4"
        data-testid="position-detail"
      >
        <ObjectInspectorHeader
          :entity-id="position.position_id"
          :eyebrow="position.position_plane"
          :statuses="[{ name: 'PositionLedgerState', value: position.state }]"
        >
          <template #actions>
            <RouterLink
              :to="`/execution/orders?module=orders&order_intent_id=${position.order_intent_id}`"
            >
              <Button>
                <IconifyIcon class="mr-1 size-4" icon="lucide:list-ordered" />
                {{ $t('page.quantPositions.detail.viewOrders') }}
              </Button>
            </RouterLink>
            <RouterLink
              :to="`/trading/recommendations?module=recommendations&entity=recommendation&id=${position.recommendation_id}`"
            >
              <Button>
                <IconifyIcon class="mr-1 size-4" icon="lucide:git-branch" />
                {{ $t('page.quantPositions.detail.viewRecommendation') }}
              </Button>
            </RouterLink>
            <RouterLink v-if="showLifecycleLinks" :to="reconciliationLink">
              <Button>
                <IconifyIcon class="mr-1 size-4" icon="lucide:scale" />
                {{ $t('page.quantPositions.detail.viewReconciliation') }}
              </Button>
            </RouterLink>
            <RouterLink v-if="showLifecycleLinks" :to="settlementLink">
              <Button>
                <IconifyIcon class="mr-1 size-4" icon="lucide:banknote" />
                {{ $t('page.quantPositions.detail.viewSettlement') }}
              </Button>
            </RouterLink>
          </template>
        </ObjectInspectorHeader>

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
                :to="`/execution/orders?module=intents&entity=order-intent&id=${position.order_intent_id}`"
              />
            </DescriptionsItem>
            <DescriptionsItem :label="$t('page.quantPositions.columns.market')">
              <EntityRouteLink
                mono
                :label="position.market_id"
                :to="`/trading/market-intelligence?module=live&entity=market&id=${position.market_id}`"
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
        <ExitMonitorCard
          v-if="exitMonitorObservation"
          :observation="exitMonitorObservation"
        />
      </div>
    </AsyncState>
  </WorkspaceInspectorSurface>
</template>
