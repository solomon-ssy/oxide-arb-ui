<script lang="ts" setup>
import type { ExecutionRecoveryView } from '@vben/types';

import { computed, onMounted, ref, watch } from 'vue';

import { useRequestHandler } from '@vben/request/qp';

import { Alert, Button, Tag } from 'antdv-next';

import { getExecutionRecovery } from '#/api/system';
import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import { formatUsd, truncateHexId } from '#/shared/components/format';
import {
  findTagOption,
  useReconciliationResultTagOptions,
} from '#/shared/components/format/tag-options';
import { useSystemStore } from '#/store';

defineOptions({ name: 'ExecutionRecoveryCard' });

const systemStore = useSystemStore();
const { handleRequest } = useRequestHandler();
const reconciliationResultTagOptions = useReconciliationResultTagOptions();

const recovery = ref<ExecutionRecoveryView | null>(null);
const loading = ref(false);

async function loadRecovery() {
  loading.value = true;
  await handleRequest(getExecutionRecovery, (view) => {
    recovery.value = view;
  });
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

watch(
  () => systemStore.status?.kill_switch?.state,
  (next, prev) => {
    if (prev !== undefined && next !== prev) {
      void loadRecovery();
    }
  },
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
        {{ $t('page.systemAdmin.refresh') }}
      </Button>
    </template>
    <div class="flex flex-col gap-3">
      <Alert
        v-if="recovery"
        :message="
          recoveryBlocked
            ? $t('page.systemAdmin.recovery.autoExecutionBlocked')
            : $t('page.systemAdmin.recovery.clear')
        "
        :type="recoveryBlocked ? 'warning' : 'success'"
        show-icon
      />
      <div
        v-if="recovery"
        class="text-muted-foreground grid grid-cols-2 gap-x-3 gap-y-1 text-xs"
      >
        <span>{{ $t('page.systemAdmin.recovery.unresolvable') }}</span>
        <span class="text-foreground text-right tabular-nums">
          {{ recovery.summary.unresolvable_count }}
        </span>
      </div>
      <div
        v-if="(recovery?.summary.next_steps.length ?? 0) > 0"
        class="flex flex-col gap-1"
      >
        <span class="text-muted-foreground text-xs font-medium">
          {{ $t('page.systemAdmin.recovery.nextSteps') }}
        </span>
        <ul class="list-inside list-disc text-xs">
          <li
            v-for="(step, index) in recovery?.summary.next_steps"
            :key="index"
          >
            {{ step }}
          </li>
        </ul>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-muted-foreground text-xs font-medium">
          {{ $t('page.systemAdmin.recovery.blocking') }}
        </span>
        <div
          v-if="(recovery?.blocking_reconciliations.length ?? 0) === 0"
          class="text-muted-foreground text-xs"
        >
          {{ $t('page.systemAdmin.recovery.none') }}
        </div>
        <div
          v-for="row in recovery?.blocking_reconciliations ?? []"
          :key="row.reconciliation_id"
          class="flex items-center justify-between gap-2 border-b pb-1.5 text-xs last:border-b-0"
        >
          <span class="font-mono">
            {{ truncateHexId(row.reconciliation_id, 8, 4) }}
          </span>
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
      </div>
    </div>
  </DashboardPanel>
</template>
