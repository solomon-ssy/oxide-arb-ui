<script lang="ts" setup>
import type { PositionDetailView, PositionView } from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';
import { POSITION_LEDGER_STATES } from '@vben/types';

import { Card, Descriptions, DescriptionsItem } from 'antdv-next';

import { getPosition } from '#/api/positions';
import { $t } from '#/locales';
import AsyncState from '#/shared/components/async-state.vue';
import EntityDetailHeader from '#/shared/components/entity-detail-header.vue';
import EntityRouteButton from '#/shared/components/entity-route-button.vue';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import {
  formatDateTimeLocal,
  formatPrice,
  formatShares,
  formatUsd,
} from '#/shared/components/format';
import {
  findTagOption,
  usePositionLedgerStateTagOptions,
} from '#/shared/components/format/tag-options';
import { useDrawerIntentRevisionRefresh } from '#/shared/composables/use-drawer-intent-revision-refresh';
import {
  reconciliationQueuePath,
  settlementRedeemsPath,
} from '#/shared/routes/execution-plane';

import ExitMonitorCard from '../../shared/exit-monitor-card.vue';

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

const headerTags = computed(() => {
  const current = position.value;
  if (!current) {
    return [];
  }
  return [
    {
      color: findTagOption(stateTagOptions, current.state)?.color,
      label: findTagOption(stateTagOptions, current.state)?.label ?? '',
    },
    { color: 'default', label: current.position_plane },
  ];
});

const stateTagOptions = usePositionLedgerStateTagOptions();

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
    : '/quant/reconciliations',
);

const settlementLink = computed(() =>
  position.value
    ? settlementRedeemsPath({ market_id: position.value.market_id })
    : '/quant/settlement-redeems',
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

const [Drawer, drawerApi] = useVbenDrawer({
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
  <Drawer
    :title="$t('page.quantPositions.detail.title')"
    class="w-full max-w-3xl"
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
        <EntityDetailHeader :id="position.position_id" :tags="headerTags">
          <template #actions>
            <EntityRouteButton
              icon="lucide:list-ordered"
              :label="$t('page.quantPositions.detail.viewOrders')"
              :to="`/quant/execution-orders?order_intent_id=${position.order_intent_id}`"
            />
            <EntityRouteButton
              icon="lucide:git-branch"
              :label="$t('page.quantPositions.detail.viewRecommendation')"
              :to="`/quant/recommendations/${position.recommendation_id}`"
            />
            <EntityRouteButton
              v-if="showLifecycleLinks"
              icon="lucide:scale"
              :label="$t('page.quantPositions.detail.viewReconciliation')"
              :to="reconciliationLink"
            />
            <EntityRouteButton
              v-if="showLifecycleLinks"
              icon="lucide:banknote"
              :label="$t('page.quantPositions.detail.viewSettlement')"
              :to="settlementLink"
            />
          </template>
        </EntityDetailHeader>

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
        <ExitMonitorCard
          v-if="exitMonitorObservation"
          :observation="exitMonitorObservation"
        />
      </div>
    </AsyncState>
  </Drawer>
</template>
