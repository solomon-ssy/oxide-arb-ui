<script lang="ts" setup>
import type {
  ControlFactorMaterializationRunView,
  MaterializationScheduleStatusView,
} from '@vben/types';

import { computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';
import { useRequestHandler } from '@vben/request/oxide';

import { Tag, Tooltip } from 'antdv-next';

import { fetchReplayPage } from '#/api/replay';
import { getMaterializationSchedules } from '#/api/system';
import { $t } from '#/locales';
import { DASHBOARD_SURFACE } from '#/shared/components/dashboard-accent';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import { formatDateTimeLocal } from '#/shared/components/format';
import {
  MATERIALIZATION_RUN_KIND_COLOR,
  MATERIALIZATION_RUN_STATUS_COLOR,
} from '#/shared/components/materialization-run';
import { useOxideAccess } from '#/shared/composables/use-oxide-access';
import { usePolling } from '#/shared/composables/use-polling';
import { useReplayStore } from '#/store';

defineOptions({ name: 'DashboardReplayRunsCard' });

const RECENT_RUNS_LIMIT = 6;
const SCHEDULE_POLL_MS = 60_000;
const ACTIVE_POLL_MS = 5000;

const surface = DASHBOARD_SURFACE;

const router = useRouter();
const replayStore = useReplayStore();
const { handleRequest } = useRequestHandler();
const { hasAccessByCodes } = useOxideAccess();

const canReadSchedules = computed(() =>
  hasAccessByCodes(['control_factor:read']),
);
const canReadHistory = computed(() => hasAccessByCodes(['replay:read']));

const activeRuns = computed(() => replayStore.queuedOrRunning);
const schedules = computed(() => replayStore.schedules);
const historyRuns = computed(() =>
  replayStore.recentRunsExcludingActive.slice(0, RECENT_RUNS_LIMIT),
);

const hasActiveRuns = computed(() => activeRuns.value.length > 0);

function scheduleLabel(schedule: MaterializationScheduleStatusView) {
  const key = `page.dashboard.replayCard.schedules.${schedule.schedule_id}`;
  const translated = $t(key);
  return translated === key ? schedule.schedule_id : translated;
}

function modeContractLabel(
  contract: MaterializationScheduleStatusView['mode_contract'],
) {
  return $t(`enum.materializationScheduleModeContract.${contract}`);
}

function scheduleActivationTag(schedule: MaterializationScheduleStatusView) {
  if (schedule.activation.state === 'runnable') {
    return {
      color: 'success' as const,
      label: $t('page.dashboard.replayCard.runnable'),
    };
  }
  return {
    color: 'default' as const,
    label: $t(
      `page.dashboard.replayCard.inactiveReason.${schedule.activation.reason}`,
    ),
  };
}

async function refreshSchedules() {
  if (!canReadSchedules.value) {
    return;
  }
  await handleRequest(getMaterializationSchedules, (rows) =>
    replayStore.setSchedules(rows),
  );
}

async function refreshRecentRuns() {
  if (!canReadHistory.value) {
    return;
  }
  await handleRequest(
    () => fetchReplayPage({ page: 1, size: RECENT_RUNS_LIMIT }),
    (page) => replayStore.setRecentRuns(page.items),
  );
}

function openReplayRun(runId: string) {
  router.push({ path: '/replay', query: { run_id: runId } });
}

function goReplay() {
  router.push('/replay');
}

function runRowLabel(run: ControlFactorMaterializationRunView) {
  return `${run.materialization_run_id.slice(0, 8)}… · ${$t(`enum.materializationRunKind.${run.run_kind}`)}`;
}

onMounted(async () => {
  await Promise.all([refreshSchedules(), refreshRecentRuns()]);
});

usePolling(refreshSchedules, {
  enabled: computed(() => canReadSchedules.value && !hasActiveRuns.value),
  intervalMs: SCHEDULE_POLL_MS,
  pauseOnHidden: true,
});

usePolling(
  async () => {
    await Promise.all([refreshSchedules(), refreshRecentRuns()]);
  },
  {
    enabled: computed(
      () =>
        hasActiveRuns.value && (canReadSchedules.value || canReadHistory.value),
    ),
    immediate: false,
    intervalMs: ACTIVE_POLL_MS,
    pauseOnHidden: true,
  },
);

watch(
  () => activeRuns.value.length,
  async (count, prev) => {
    if (prev > count) {
      await Promise.all([refreshSchedules(), refreshRecentRuns()]);
    }
  },
);
</script>

<template>
  <DashboardPanel
    fill
    icon="lucide:database-zap"
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

    <section v-if="canReadSchedules" class="mt-3">
      <h4
        class="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase"
      >
        {{ $t('page.dashboard.replayCard.schedulesTitle') }}
      </h4>
      <div
        v-if="schedules.length === 0"
        class="text-muted-foreground py-3 text-center text-xs"
      >
        {{ $t('page.dashboard.replayCard.schedulesEmpty') }}
      </div>
      <div v-else class="flex flex-col gap-2">
        <div
          v-for="schedule in schedules"
          :key="schedule.schedule_id"
          :class="surface.rowHover"
          class="rounded-md px-2.5 py-2 text-sm transition-colors"
        >
          <div class="flex items-center justify-between gap-2">
            <Tooltip :title="modeContractLabel(schedule.mode_contract)">
              <span class="min-w-0 truncate font-medium">
                {{ scheduleLabel(schedule) }}
              </span>
            </Tooltip>
            <Tag :color="scheduleActivationTag(schedule).color">
              {{ scheduleActivationTag(schedule).label }}
            </Tag>
          </div>
          <dl
            class="text-muted-foreground mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs"
          >
            <div>
              <dt class="inline">
                {{ $t('page.dashboard.replayCard.lastRun') }}:
              </dt>
              <dd class="inline tabular-nums">
                {{
                  schedule.last_run_at
                    ? formatDateTimeLocal(schedule.last_run_at)
                    : '—'
                }}
              </dd>
            </div>
            <div>
              <dt class="inline">
                {{ $t('page.dashboard.replayCard.lastSuccess') }}:
              </dt>
              <dd class="inline tabular-nums">
                {{
                  schedule.last_success_at
                    ? formatDateTimeLocal(schedule.last_success_at)
                    : '—'
                }}
              </dd>
            </div>
            <div>
              <dt class="inline">
                {{ $t('page.dashboard.replayCard.nextDue') }}:
              </dt>
              <dd class="inline tabular-nums">
                {{
                  schedule.next_due_at
                    ? formatDateTimeLocal(schedule.next_due_at)
                    : '—'
                }}
              </dd>
            </div>
            <div v-if="schedule.last_terminal_status">
              <dt class="inline">
                {{ $t('page.dashboard.replayCard.lastStatus') }}:
              </dt>
              <dd class="inline">
                <Tag
                  :color="
                    MATERIALIZATION_RUN_STATUS_COLOR[
                      schedule.last_terminal_status
                    ] ?? 'default'
                  "
                  class="ml-1"
                >
                  {{
                    $t(
                      `enum.materializationRunStatus.${schedule.last_terminal_status}`,
                    )
                  }}
                </Tag>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>

    <section v-if="canReadSchedules" class="mt-4">
      <h4
        class="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase"
      >
        {{ $t('page.dashboard.replayCard.activeTitle') }}
      </h4>
      <div
        v-if="activeRuns.length === 0"
        class="text-muted-foreground py-3 text-center text-xs"
      >
        {{ $t('page.dashboard.replayCard.activeEmpty') }}
      </div>
      <div v-else class="flex flex-col gap-2">
        <button
          v-for="run in activeRuns"
          :key="run.materialization_run_id"
          :class="surface.rowHover"
          class="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-2 text-sm transition-colors"
          type="button"
          @click="openReplayRun(run.materialization_run_id)"
        >
          <span class="text-muted-foreground flex min-w-0 items-center gap-2">
            <IconifyIcon
              class="size-4 shrink-0 animate-pulse"
              icon="lucide:loader-circle"
            />
            <Tooltip :title="run.materialization_run_id">
              <span class="truncate font-mono text-xs">
                {{ runRowLabel(run) }}
              </span>
            </Tooltip>
          </span>
          <span class="flex shrink-0 items-center gap-2">
            <Tag
              :color="MATERIALIZATION_RUN_KIND_COLOR[run.run_kind] ?? 'default'"
            >
              {{ $t(`enum.materializationRunKind.${run.run_kind}`) }}
            </Tag>
            <Tag
              :color="MATERIALIZATION_RUN_STATUS_COLOR[run.status] ?? 'default'"
            >
              {{ $t(`enum.materializationRunStatus.${run.status}`) }}
            </Tag>
          </span>
        </button>
      </div>
    </section>

    <section v-if="canReadHistory" class="mt-4">
      <h4
        class="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase"
      >
        {{ $t('page.dashboard.replayCard.historyTitle') }}
      </h4>
      <div
        v-if="historyRuns.length === 0"
        class="text-muted-foreground py-3 text-center text-xs"
      >
        {{ $t('page.dashboard.replayCard.historyEmpty') }}
      </div>
      <div v-else class="flex flex-col gap-1.5">
        <button
          v-for="run in historyRuns"
          :key="run.materialization_run_id"
          :class="surface.rowHover"
          class="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-sm transition-colors"
          type="button"
          @click="openReplayRun(run.materialization_run_id)"
        >
          <span
            class="text-muted-foreground min-w-0 truncate font-mono text-xs"
          >
            {{ runRowLabel(run) }}
          </span>
          <span class="flex shrink-0 items-center gap-2">
            <Tag
              :color="MATERIALIZATION_RUN_STATUS_COLOR[run.status] ?? 'default'"
            >
              {{ $t(`enum.materializationRunStatus.${run.status}`) }}
            </Tag>
            <span class="text-muted-foreground text-xs tabular-nums">
              {{ formatDateTimeLocal(run.finished_at ?? run.updated_at) }}
            </span>
          </span>
        </button>
      </div>
    </section>
  </DashboardPanel>
</template>
