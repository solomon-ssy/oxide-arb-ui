<script lang="ts" setup>
import type { TableColumnsType } from 'antdv-next';

import type { HealthReport } from '@vben/types';

import { computed, onMounted, ref, watch } from 'vue';

import { useRequestHandler } from '@vben/request/qp';

import { Alert, Button, Tag, Tooltip } from 'antdv-next';

import { getSystemHealth } from '#/api/system';
import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import DataList from '#/shared/components/data-list.vue';
import { formatDateTimeLocal } from '#/shared/components/format';
import { useSystemStore } from '#/store';

defineOptions({ name: 'SubsystemHealthCard' });

type HealthCheckRow = HealthReport['checks'][number];

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

function subsystemStatusColor(check: HealthCheckRow): string {
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

function subsystemStatusLabel(check: HealthCheckRow): string {
  const state = check.status;
  const label = $t(`page.systemAdmin.health.${state.status}`);
  return state.status === 'skipped' ? `${label} (${state.reason})` : label;
}

function latencyLabel(check: HealthCheckRow): string {
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

const healthRows = computed(() => health.value?.checks ?? []);

const healthColumns = computed<TableColumnsType<HealthCheckRow>>(() => [
  { dataIndex: 'name', key: 'name' },
  { dataIndex: 'detail', key: 'detail' },
  { align: 'right', dataIndex: 'latency_ms', key: 'latency_ms' },
  { align: 'right', dataIndex: 'status', key: 'status' },
]);

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
      <DataList
        :columns="healthColumns"
        :data-source="healthRows"
        :loading="loading"
        row-key="name"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <span class="font-medium">{{ record.name }}</span>
          </template>
          <template v-else-if="column.key === 'detail'">
            <Tooltip v-if="record.detail" :title="record.detail">
              <span class="text-muted-foreground max-w-56 truncate text-xs">
                {{ record.detail }}
              </span>
            </Tooltip>
          </template>
          <template v-else-if="column.key === 'latency_ms'">
            <span
              v-if="record.latency_ms !== null"
              class="text-muted-foreground text-xs tabular-nums"
            >
              {{ latencyLabel(record) }}
            </span>
          </template>
          <template v-else-if="column.key === 'status'">
            <Tag :color="subsystemStatusColor(record)">
              {{ subsystemStatusLabel(record) }}
            </Tag>
          </template>
        </template>
      </DataList>
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
