<script lang="ts" setup>
import type { TableColumnsType } from 'antdv-next';

import type { ExecutionRecoveryView } from '@vben/types';

import type { KeyValueGridItem } from '#/shared/components/key-value-grid.vue';

import { computed, onMounted, ref, watch } from 'vue';

import { useRequestHandler } from '@vben/request/qp';
import { KILL_SWITCH_STATES } from '@vben/types';

import { useDebounceFn } from '@vueuse/core';
import { Alert, Button, Empty, Steps, Tag } from 'antdv-next';

import { getExecutionRecovery } from '#/api/system';
import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import DataList from '#/shared/components/data-list.vue';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import {
  formatExecutionRecoveryStep,
  formatUsd,
  truncateHexId,
} from '#/shared/components/format';
import {
  findTagOption,
  useKillSwitchStateTagOptions,
  useReconciliationResultTagOptions,
} from '#/shared/components/format/tag-options';
import KeyValueGrid from '#/shared/components/key-value-grid.vue';
import { useDashboardStatusRefreshKey } from '#/shared/composables/use-dashboard-status-refresh-key';
import { useKillSwitchAction } from '#/shared/composables/use-system-actions';
import { useReconciliationStore, useSettlementRedeemStore } from '#/store';

defineOptions({ name: 'ExecutionRecoveryCard' });

type BlockingReconciliationRow =
  ExecutionRecoveryView['blocking_reconciliations'][number];

const reconciliationStore = useReconciliationStore();
const settlementStore = useSettlementRedeemStore();
const { handleRequest } = useRequestHandler();
const { recoveryRefreshKey } = useDashboardStatusRefreshKey();
const killSwitchAction = useKillSwitchAction();
const reconciliationResultTagOptions = useReconciliationResultTagOptions();
const killSwitchStateTagOptions = useKillSwitchStateTagOptions();

const recovery = ref<ExecutionRecoveryView | null>(null);
const loading = ref(false);
const loadFailed = ref(false);

async function loadRecovery() {
  loading.value = true;
  loadFailed.value = false;
  const view = await handleRequest(getExecutionRecovery);
  recovery.value = view;
  loadFailed.value = view === null;
  loading.value = false;
}

const recoveryBlocked = computed(() => {
  const summary = recovery.value?.summary;
  if (!summary) {
    return false;
  }
  return (
    summary.auto_execution_blocked ||
    summary.has_unresolvable_reconciliation ||
    summary.kill_switch_requires_ack
  );
});

const killSwitch = computed(() => recovery.value?.kill_switch ?? null);
const killSwitchTag = computed(() =>
  findTagOption(killSwitchStateTagOptions, killSwitch.value?.state),
);
const canAck = computed(
  () =>
    !!killSwitch.value?.requires_operator_ack &&
    killSwitchAction.canTransition(
      killSwitch.value.state,
      KILL_SWITCH_STATES.closed,
    ),
);

const unresolvableItems = computed<KeyValueGridItem[]>(() => {
  if (!recovery.value) {
    return [];
  }
  return [
    {
      key: 'unresolvable',
      label: $t('page.dashboard.recovery.unresolvable'),
      value: String(recovery.value.summary.unresolvable_count),
    },
  ];
});

const blockingRows = computed(
  () => recovery.value?.blocking_reconciliations ?? [],
);

const blockingColumns = computed<TableColumnsType<BlockingReconciliationRow>>(
  () => [
    {
      dataIndex: 'reconciliation_id',
      key: 'reconciliation_id',
    },
    {
      align: 'right',
      dataIndex: 'discrepancy_usd',
      key: 'discrepancy_usd',
    },
    {
      align: 'right',
      dataIndex: 'result',
      key: 'result',
    },
  ],
);

const nextStepItems = computed(() =>
  (recovery.value?.summary.next_steps ?? []).map((step, index) => ({
    key: String(index),
    title: formatExecutionRecoveryStep(step),
  })),
);

async function acknowledge() {
  if (!killSwitch.value) {
    return;
  }
  const result = await killSwitchAction.setTo(
    killSwitch.value,
    KILL_SWITCH_STATES.closed,
  );
  if (result) {
    void loadRecovery();
  }
}

// Recovery has many trigger sources (status frame + reconciliation/settlement
// WS bumps can all fire from a single resolve); debounce to one refetch.
const reloadRecovery = useDebounceFn(() => void loadRecovery(), 200);

// `system.status` carries the recovery rollup + kill-switch + runtime mode.
watch(recoveryRefreshKey, reloadRecovery);
// Reconciliation resolves + settlement transitions can clear/raise blockers.
watch(
  () => [reconciliationStore.revision, settlementStore.revision],
  reloadRecovery,
);

onMounted(() => {
  void loadRecovery();
});
</script>

<template>
  <DashboardPanel
    :title="$t('page.dashboard.recovery.title')"
    icon="lucide:life-buoy"
    tone="cyan"
    fill
  >
    <template #extra>
      <Button :loading="loading" size="small" @click="loadRecovery">
        {{ $t('page.dashboard.recovery.refresh') }}
      </Button>
    </template>
    <div class="flex flex-col gap-3">
      <Alert
        v-if="loadFailed"
        :message="$t('page.dashboard.recovery.loadFailed')"
        show-icon
        type="error"
      />

      <Alert
        v-else-if="recovery"
        :message="
          recoveryBlocked
            ? $t('page.dashboard.recovery.autoExecutionBlocked')
            : $t('page.dashboard.recovery.clear')
        "
        :type="recoveryBlocked ? 'warning' : 'success'"
        show-icon
      />

      <KeyValueGrid
        v-if="recovery"
        :bordered="false"
        :column="1"
        :items="unresolvableItems"
      />

      <div
        v-if="killSwitch"
        class="flex items-center justify-between gap-2 border-y py-1.5 text-xs"
      >
        <div class="flex items-center gap-2">
          <span class="text-muted-foreground">
            {{ $t('page.dashboard.recovery.killSwitch') }}
          </span>
          <Tag :color="killSwitchTag?.color ?? 'default'">
            {{ killSwitchTag?.label ?? killSwitch.state }}
          </Tag>
          <Tag v-if="killSwitch.requires_operator_ack" color="warning">
            {{ $t('page.dashboard.recovery.requiresAck') }}
          </Tag>
        </div>
        <Button v-if="canAck" danger size="small" @click="acknowledge">
          {{ $t('page.dashboard.recovery.ack') }}
        </Button>
      </div>

      <div v-if="nextStepItems.length > 0" class="flex flex-col gap-1">
        <span class="text-muted-foreground text-xs font-medium">
          {{ $t('page.dashboard.recovery.nextSteps') }}
        </span>
        <Steps
          direction="vertical"
          progress-dot
          size="small"
          :items="nextStepItems"
        />
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-muted-foreground text-xs font-medium">
          {{ $t('page.dashboard.recovery.blocking') }}
        </span>
        <Empty
          v-if="blockingRows.length === 0"
          :description="$t('page.dashboard.recovery.none')"
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        />
        <DataList
          v-else
          :columns="blockingColumns"
          :data-source="blockingRows"
          row-key="reconciliation_id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'reconciliation_id'">
              <EntityRouteLink
                mono
                :label="truncateHexId(record.reconciliation_id, 8, 4)"
                :to="`/quant/reconciliations?open=${record.reconciliation_id}`"
              />
            </template>
            <template v-else-if="column.key === 'discrepancy_usd'">
              <span class="text-muted-foreground tabular-nums">
                {{ formatUsd(record.discrepancy_usd) }}
              </span>
            </template>
            <template v-else-if="column.key === 'result'">
              <Tag
                :color="
                  findTagOption(reconciliationResultTagOptions, record.result)
                    ?.color ?? 'default'
                "
              >
                {{
                  findTagOption(reconciliationResultTagOptions, record.result)
                    ?.label ?? record.result
                }}
              </Tag>
            </template>
          </template>
        </DataList>
        <span
          v-if="blockingRows.length > 0"
          class="text-muted-foreground text-xs"
        >
          {{ $t('page.dashboard.recovery.resolveHint') }}
        </span>
      </div>
    </div>
  </DashboardPanel>
</template>
