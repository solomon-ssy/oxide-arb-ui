<script lang="ts" setup>
import type { HealthReport } from '@vben/types';

import { onMounted, ref, watch } from 'vue';

import { useRequestHandler } from '@vben/request/qp';

import { Alert, Button, Tag } from 'antdv-next';

import { getSystemHealth } from '#/api/system';
import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import { formatDateTimeLocal } from '#/shared/components/format';
import { useSystemStore } from '#/store';

defineOptions({ name: 'SubsystemHealthCard' });

const systemStore = useSystemStore();
const { handleRequest } = useRequestHandler();

const health = ref<HealthReport | null>(null);
const loading = ref(false);

async function loadHealth() {
  loading.value = true;
  await handleRequest(getSystemHealth, (report) => {
    health.value = report;
  });
  loading.value = false;
}

function subsystemStatusColor(check: HealthReport['checks'][number]): string {
  switch (check.status.status) {
    case 'healthy': {
      return 'success';
    }
    case 'unhealthy': {
      return 'error';
    }
    default: {
      return 'default';
    }
  }
}

function subsystemStatusLabel(check: HealthReport['checks'][number]): string {
  const state = check.status;
  const label = $t(`page.systemAdmin.health.${state.status}`);
  return state.status === 'skipped' ? `${label} (${state.reason})` : label;
}

function latencyLabel(check: HealthReport['checks'][number]): string {
  if (check.latency_ms === null) {
    return '';
  }
  if (check.name === 'websocket') {
    return $t('page.systemAdmin.health.messageAgeMs', {
      ms: check.latency_ms,
    });
  }
  return `${check.latency_ms}ms`;
}

watch(
  () => systemStore.status?.operational_phase.phase,
  () => {
    void loadHealth();
  },
);

onMounted(() => {
  void loadHealth();
});
</script>

<template>
  <DashboardPanel
    :title="$t('page.dashboard.health.title')"
    icon="lucide:heart-pulse"
    tone="teal"
    fill
  >
    <template #extra>
      <Button :loading="loading" size="small" @click="loadHealth">
        {{ $t('page.systemAdmin.refresh') }}
      </Button>
    </template>
    <div class="flex flex-col gap-2">
      <Alert
        v-if="health"
        :message="
          health.overall_healthy
            ? $t('page.systemAdmin.health.overallHealthy')
            : $t('page.systemAdmin.health.overallUnhealthy')
        "
        :type="health.overall_healthy ? 'success' : 'error'"
        show-icon
      />
      <div
        v-for="check in health?.checks ?? []"
        :key="check.name"
        class="flex items-center justify-between gap-2 border-b pb-1.5 text-sm last:border-b-0"
      >
        <span class="font-medium">{{ check.name }}</span>
        <div class="flex items-center gap-2">
          <span
            v-if="check.detail"
            :title="check.detail"
            class="text-muted-foreground max-w-56 truncate text-xs"
          >
            {{ check.detail }}
          </span>
          <span
            v-if="check.latency_ms !== null"
            class="text-muted-foreground text-xs tabular-nums"
          >
            {{ latencyLabel(check) }}
          </span>
          <Tag :color="subsystemStatusColor(check)">
            {{ subsystemStatusLabel(check) }}
          </Tag>
        </div>
      </div>
      <div
        v-if="health"
        class="text-muted-foreground text-right text-xs tabular-nums"
      >
        {{ $t('page.systemAdmin.health.checkedAt') }}:
        {{ formatDateTimeLocal(health.checked_at) }}
      </div>
    </div>
  </DashboardPanel>
</template>
