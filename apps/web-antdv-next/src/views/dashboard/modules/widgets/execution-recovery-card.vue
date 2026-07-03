<script lang="ts" setup>
import type { ExecutionRecoveryView } from '@vben/types';

import { computed, onMounted, ref, watch } from 'vue';

import { useRequestHandler } from '@vben/request/qp';
import { KILL_SWITCH_STATES } from '@vben/types';

import { useDebounceFn } from '@vueuse/core';
import { Alert, Button, Tag } from 'antdv-next';

import { getExecutionRecovery } from '#/api/system';
import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
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
import { useDashboardStatusRefreshKey } from '#/shared/composables/use-dashboard-status-refresh-key';
import { useKillSwitchAction } from '#/shared/composables/use-system-actions';
import { useReconciliationStore, useSettlementRedeemStore } from '#/store';

defineOptions({ name: 'ExecutionRecoveryCard' });

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

      <div
        v-if="recovery"
        class="text-muted-foreground grid grid-cols-2 gap-x-3 gap-y-1 text-xs"
      >
        <span>{{ $t('page.dashboard.recovery.unresolvable') }}</span>
        <span class="text-foreground text-right tabular-nums">
          {{ recovery.summary.unresolvable_count }}
        </span>
      </div>

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
          <span v-if="killSwitch.requires_operator_ack" class="text-amber-600">
            {{ $t('page.dashboard.recovery.requiresAck') }}
          </span>
        </div>
        <Button v-if="canAck" danger size="small" @click="acknowledge">
          {{ $t('page.dashboard.recovery.ack') }}
        </Button>
      </div>

      <div
        v-if="(recovery?.summary.next_steps.length ?? 0) > 0"
        class="flex flex-col gap-1"
      >
        <span class="text-muted-foreground text-xs font-medium">
          {{ $t('page.dashboard.recovery.nextSteps') }}
        </span>
        <ol class="list-inside list-decimal text-xs">
          <li
            v-for="(step, index) in recovery?.summary.next_steps"
            :key="index"
          >
            {{ formatExecutionRecoveryStep(step) }}
          </li>
        </ol>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-muted-foreground text-xs font-medium">
          {{ $t('page.dashboard.recovery.blocking') }}
        </span>
        <div
          v-if="(recovery?.blocking_reconciliations.length ?? 0) === 0"
          class="text-muted-foreground text-xs"
        >
          {{ $t('page.dashboard.recovery.none') }}
        </div>
        <div
          v-for="row in recovery?.blocking_reconciliations ?? []"
          :key="row.reconciliation_id"
          class="flex items-center justify-between gap-2 border-b pb-1.5 text-xs last:border-b-0"
        >
          <EntityRouteLink
            mono
            :label="truncateHexId(row.reconciliation_id, 8, 4)"
            :to="`/quant/reconciliations?open=${row.reconciliation_id}`"
          />
          <div class="flex items-center gap-2">
            <span class="text-muted-foreground tabular-nums">
              {{ formatUsd(row.discrepancy_usd) }}
            </span>
            <Tag
              :color="
                findTagOption(reconciliationResultTagOptions, row.result)
                  ?.color ?? 'default'
              "
            >
              {{
                findTagOption(reconciliationResultTagOptions, row.result)
                  ?.label ?? row.result
              }}
            </Tag>
          </div>
        </div>
        <span
          v-if="(recovery?.blocking_reconciliations.length ?? 0) > 0"
          class="text-muted-foreground text-xs"
        >
          {{ $t('page.dashboard.recovery.resolveHint') }}
        </span>
      </div>
    </div>
  </DashboardPanel>
</template>
