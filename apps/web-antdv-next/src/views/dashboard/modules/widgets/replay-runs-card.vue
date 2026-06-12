<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import { Tag } from 'antdv-next';

import { $t } from '#/locales';
import { DASHBOARD_SURFACE } from '#/shared/components/dashboard-accent';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import { formatDateTimeLocal } from '#/shared/components/format';
import { useReplayStore } from '#/store';

defineOptions({ name: 'DashboardReplayRunsCard' });

const surface = DASHBOARD_SURFACE;

const router = useRouter();
const replayStore = useReplayStore();

const runs = computed(() => replayStore.queuedOrRunning);

const RUN_STATUS_COLOR = {
  queued: 'default',
  running: 'processing',
} as const;

function openReplayRun(runId: string) {
  router.push({ path: '/replay', query: { run_id: runId } });
}

function goReplay() {
  router.push('/replay');
}
</script>

<template>
  <DashboardPanel
    fill
    icon="lucide:history"
    tone="teal"
    :title="$t('page.dashboard.replayCard.title')"
  >
    <template #extra>
      <a class="cursor-pointer text-xs" @click="goReplay">
        {{ $t('page.dashboard.replayCard.toReplay') }}
      </a>
    </template>

    <p class="text-muted-foreground text-xs leading-relaxed">
      {{ $t('page.dashboard.replayCard.hint') }}
    </p>

    <div
      v-if="runs.length === 0"
      class="text-muted-foreground py-6 text-center text-sm"
    >
      {{ $t('page.dashboard.replayCard.empty') }}
    </div>
    <div v-else class="flex flex-col gap-2">
      <button
        v-for="run in runs"
        :key="run.materialization_run_id"
        :class="surface.rowHover"
        class="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-2 text-sm transition-colors"
        type="button"
        @click="openReplayRun(run.materialization_run_id)"
      >
        <span class="text-muted-foreground flex min-w-0 items-center gap-2">
          <IconifyIcon class="size-4 shrink-0" icon="lucide:database" />
          <span class="truncate font-mono text-xs">
            {{ run.materialization_run_id.slice(0, 8) }}…
          </span>
        </span>
        <span class="flex shrink-0 items-center gap-2">
          <Tag
            :color="
              RUN_STATUS_COLOR[run.status as keyof typeof RUN_STATUS_COLOR] ??
              'default'
            "
          >
            {{ $t(`enum.materializationRunStatus.${run.status}`) }}
          </Tag>
          <span class="text-muted-foreground text-xs tabular-nums">
            {{ formatDateTimeLocal(run.started_at ?? run.created_at) }}
          </span>
        </span>
      </button>
    </div>
  </DashboardPanel>
</template>
