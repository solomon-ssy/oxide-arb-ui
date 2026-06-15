<script lang="ts" setup>
import type {
  ControlFactorMaterializationRunView,
  ControlFactorStageReportView,
  UuidString,
} from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/oxide';

import { Descriptions, DescriptionsItem, Tag } from 'antdv-next';

import { getReplayHistory, getReplayRun } from '#/api/replay';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import {
  isTerminalMaterializationRun,
  MATERIALIZATION_RUN_KIND_COLOR,
  MATERIALIZATION_RUN_STATUS_COLOR,
} from '#/shared/components/materialization-run';
import { usePolling } from '#/shared/composables/use-polling';
import { useReplayStore } from '#/store';

import StageReportTimeline from './stage-report-timeline.vue';

defineOptions({ name: 'ReplayRunDetailDrawer' });

const { handleRequest } = useRequestHandler();
const replayStore = useReplayStore();

const run = ref<ControlFactorMaterializationRunView | null>(null);
const stages = ref<ControlFactorStageReportView[]>([]);
const loading = ref(false);
const stagesLoading = ref(false);
const drawerOpen = ref(false);
const currentRunId = ref<null | UuidString>(null);

const isTerminal = computed(
  () => run.value !== null && isTerminalMaterializationRun(run.value.status),
);

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    drawerOpen.value = isOpen;
    if (isOpen) {
      const { runId } = drawerApi.getData<{ runId: UuidString }>();
      currentRunId.value = runId;
      void load(runId);
    } else {
      run.value = null;
      stages.value = [];
      currentRunId.value = null;
    }
  },
});

async function load(runId: UuidString) {
  loading.value = true;
  try {
    await handleRequest(
      () => getReplayRun(runId),
      (view) => {
        run.value = view;
        replayStore.upsertRun(view);
      },
    );
  } finally {
    loading.value = false;
  }

  stagesLoading.value = true;
  try {
    await handleRequest(
      () => getReplayHistory(runId),
      (rows) => {
        stages.value = rows;
      },
    );
  } finally {
    stagesLoading.value = false;
  }
}

usePolling(
  async () => {
    if (currentRunId.value) {
      await load(currentRunId.value);
    }
  },
  {
    enabled: computed(() => drawerOpen.value && !isTerminal.value),
    intervalMs: 5000,
    pauseOnHidden: true,
  },
);
</script>

<template>
  <Drawer
    :loading="loading"
    :title="$t('page.replay.detail.title')"
    class="w-full max-w-2xl"
  >
    <template v-if="run">
      <Descriptions :column="1" bordered size="small">
        <DescriptionsItem :label="$t('page.replay.detail.runId')">
          <span class="font-mono text-xs">{{
            run.materialization_run_id
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.replay.detail.runKind')">
          <Tag
            :color="MATERIALIZATION_RUN_KIND_COLOR[run.run_kind] ?? 'default'"
          >
            {{ $t(`enum.materializationRunKind.${run.run_kind}`) }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.replay.detail.status')">
          <Tag
            :color="MATERIALIZATION_RUN_STATUS_COLOR[run.status] ?? 'default'"
          >
            {{ $t(`enum.materializationRunStatus.${run.status}`) }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.replay.detail.window')">
          {{ formatDateTimeLocal(run.window_from) }}
          →
          {{ formatDateTimeLocal(run.window_to) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.replay.detail.createdBy')">
          {{ run.created_by }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.replay.detail.startedAt')">
          {{ run.started_at ? formatDateTimeLocal(run.started_at) : '—' }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.replay.detail.finishedAt')">
          {{ run.finished_at ? formatDateTimeLocal(run.finished_at) : '—' }}
        </DescriptionsItem>
        <DescriptionsItem
          v-if="run.failure_code"
          :label="$t('page.replay.detail.failureCode')"
        >
          {{ run.failure_code }}
        </DescriptionsItem>
        <DescriptionsItem
          v-if="run.failure_detail"
          :label="$t('page.replay.detail.failureDetail')"
        >
          {{ run.failure_detail }}
        </DescriptionsItem>
      </Descriptions>

      <h4 class="mb-2 mt-4 text-sm font-medium">
        {{ $t('page.replay.detail.stagesTitle') }}
      </h4>
      <StageReportTimeline :items="stages" :loading="stagesLoading" />
    </template>
  </Drawer>
</template>
