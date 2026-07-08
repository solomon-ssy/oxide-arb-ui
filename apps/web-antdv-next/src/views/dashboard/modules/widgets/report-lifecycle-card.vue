<script lang="ts" setup>
import type { ReportLifecycleEventKind } from '@vben/types';

import { computed } from 'vue';

import { Button, Empty, Spin, Tag } from 'antdv-next';

import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import { formatDateTimeLocal } from '#/shared/components/format';
import { useQuantReportStore } from '#/store';

defineOptions({ name: 'ReportLifecycleCard' });

const emit = defineEmits<{
  navigate: [];
}>();

const quantReportStore = useQuantReportStore();

const lastEvent = computed(() => quantReportStore.lastEvent);

const EVENT_COLOR: Record<ReportLifecycleEventKind, string> = {
  empty: 'default',
  expired: 'warning',
  failed: 'error',
  published: 'success',
  revoked: 'warning',
  started: 'processing',
};

const eventColor = computed(() => {
  const event = lastEvent.value?.event;
  return event ? EVENT_COLOR[event] : 'default';
});

const inProgress = computed(() => lastEvent.value?.event === 'started');
</script>

<template>
  <DashboardPanel
    :title="$t('page.dashboard.reportLifecycle.title')"
    icon="lucide:radio"
    tone="indigo"
  >
    <template #extra>
      <Button size="small" type="link" @click="emit('navigate')">
        {{ $t('page.dashboard.viewAll') }}
      </Button>
    </template>
    <div v-if="lastEvent" class="flex flex-wrap items-center gap-3">
      <Spin v-if="inProgress" size="small" />
      <Tag :color="eventColor">
        {{ $t(`page.dashboard.reportLifecycle.event.${lastEvent.event}`) }}
      </Tag>
      <span class="text-muted-foreground text-xs tabular-nums">
        {{ formatDateTimeLocal(lastEvent.as_of) }}
      </span>
      <span class="text-muted-foreground text-xs">
        {{ $t(`enum.quantRuntimeMode.${lastEvent.runtime_mode}`) }}
      </span>
    </div>
    <Empty
      v-else
      :description="$t('page.dashboard.reportLifecycle.none')"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />
  </DashboardPanel>
</template>
