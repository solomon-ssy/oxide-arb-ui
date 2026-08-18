<script lang="ts" setup>
import type { ReportRunView } from '@vben/types';

import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Alert, Button, Descriptions, DescriptionsItem } from 'antdv-next';

import { getReportRun, retryReportRun } from '#/api/quant-reports';
import { $t } from '#/locales';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import { formatDateTimeLocal } from '#/shared/components/format';
import ObjectInspectorHeader from '#/shared/components/object-inspector/object-inspector-header.vue';
import WorkspaceObjectStage from '#/shared/components/workspace/workspace-object-stage.vue';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useQuantReportStore } from '#/store';

defineOptions({ name: 'ReportRunDrawer' });

interface DrawerData {
  runId: string;
}

const route = useRoute();
const router = useRouter();
const store = useQuantReportStore();
const { governed } = useGovernedAction();
const { hasAccessByCodes } = useQpAccess();
const { handleRequest } = useRequestHandler();

const run = ref<null | ReportRunView>(null);
const loading = ref(false);
const loadError = ref<null | string>(null);
const runId = ref<null | string>(null);

const canRetry = computed(
  () =>
    hasAccessByCodes(['quant_report:enqueue']) &&
    run.value?.trigger_kind === 'ad_hoc' &&
    ['abandoned', 'failed', 'skipped'].includes(run.value.status),
);

function display(value: null | number | string | undefined): string {
  return value === null || value === undefined || value === ''
    ? '—'
    : String(value);
}

function durationSeconds(
  end: null | string,
  start: null | string,
): null | number {
  if (!end || !start) return null;
  return Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 1000));
}

const lateness = computed(() =>
  durationSeconds(
    run.value?.decision_at ?? null,
    run.value?.scheduled_for ?? null,
  ),
);
const queueLatency = computed(() =>
  durationSeconds(
    run.value?.started_at ?? null,
    run.value?.requested_at ?? null,
  ),
);

async function load() {
  const id = runId.value;
  if (!id) return;
  loading.value = true;
  loadError.value = null;
  try {
    const result = await handleRequest(() => getReportRun(id), {
      silent: true,
      onError: (error) => {
        loadError.value = error.message;
      },
    });
    run.value = result ?? null;
  } finally {
    loading.value = false;
  }
}

async function retry() {
  if (!run.value) return;
  const source = run.value;
  const result = await governed(
    (ctx) =>
      retryReportRun(
        source.report_run_id,
        { reason: ctx.reason, request_id: crypto.randomUUID() },
        ctx,
      ),
    {
      summary: $t('page.quantReports.runs.retrySummary', {
        id: source.report_run_id,
      }),
      title: $t('page.quantReports.runs.retry'),
    },
  );
  if (result) {
    await router.push({
      path: '/trading/recommendations',
      query: {
        ...route.query,
        entity: 'report-run',
        id: result.report_run_id,
        module: 'reports',
      },
    });
    runId.value = result.report_run_id;
    await load();
  }
}

const [, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      runId.value = drawerApi.getData<DrawerData>().runId;
      void load();
      return;
    }
    run.value = null;
    runId.value = null;
    const query = { ...route.query };
    if (query.entity === 'report-run') {
      delete query.entity;
      delete query.id;
    }
    void router.push({ query });
  },
});

watch(
  () => store.runRevision,
  () => {
    if (store.lastRunEvent?.report_run_id === runId.value) void load();
  },
);
watch(
  () => [route.query.entity, route.query.id] as const,
  ([entity, id]) => {
    if (
      entity !== 'report-run' ||
      typeof id !== 'string' ||
      !id ||
      id === runId.value
    ) {
      return;
    }
    runId.value = id;
    void load();
  },
);
</script>

<template>
  <WorkspaceObjectStage
    :drawer-api="drawerApi"
    :loading="loading"
    :title="$t('page.quantReports.runs.drawerTitle')"
  >
    <template v-if="canRetry" #actions>
      <Button danger @click="retry">
        {{ $t('page.quantReports.runs.retry') }}
      </Button>
    </template>
    <Alert
      v-if="loadError"
      class="mb-4"
      :description="loadError"
      show-icon
      type="error"
    />
    <div v-if="run" class="flex flex-col gap-4" data-testid="report-run-drawer">
      <ObjectInspectorHeader
        :entity-id="run.report_run_id"
        :statuses="[
          {
            context: 'report-run-drawer',
            name: 'ReportRunStatus',
            value: run.status,
          },
          {
            context: 'report-run-drawer',
            name: 'ReportTriggerKind',
            value: run.trigger_kind,
          },
        ]"
      />

      <Alert
        v-if="run.error_code || run.error_summary"
        :description="run.error_summary || undefined"
        :message="run.error_code || $t('page.quantReports.runs.failure')"
        show-icon
        type="error"
      />

      <Descriptions :column="2" bordered size="small">
        <DescriptionsItem :label="$t('page.quantReports.runs.runId')" :span="2">
          <span class="font-mono text-xs">{{ run.report_run_id }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.runs.schedule')">
          {{ display(run.schedule_id) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.runs.requestId')">
          {{ display(run.request_id) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.runs.scheduledFor')">
          {{ formatDateTimeLocal(run.scheduled_for) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.runs.requestedAt')">
          {{ formatDateTimeLocal(run.requested_at) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.runs.startedAt')">
          {{ formatDateTimeLocal(run.started_at) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.runs.decisionAt')">
          {{ formatDateTimeLocal(run.decision_at) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.runs.lateness')">
          {{ lateness === null ? '—' : `${lateness}s` }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.runs.queueLatency')">
          {{ queueLatency === null ? '—' : `${queueLatency}s` }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.runs.heartbeatAt')">
          {{ formatDateTimeLocal(run.heartbeat_at) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.runs.leaseExpiresAt')">
          {{ formatDateTimeLocal(run.lease_expires_at) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.runs.leaseOwner')">
          {{ display(run.lease_owner) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.runs.finishedAt')">
          {{ formatDateTimeLocal(run.finished_at) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.runs.terminalReason')">
          {{
            run.terminal_reason
              ? $t(`enum.reportRunTerminalReason.${run.terminal_reason}`)
              : '—'
          }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.runs.topN')">
          {{ display(run.top_n) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.runs.knowledgeLag')"
          :span="2"
        >
          {{
            run.knowledge_lag_secs === null ? '—' : `${run.knowledge_lag_secs}s`
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.runs.decisionPolicySnapshot')"
          :span="2"
        >
          {{ display(run.decision_policy_snapshot_id) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.runs.retryOf')">
          <EntityRouteLink
            v-if="run.retry_of_run_id"
            mono
            :label="run.retry_of_run_id"
            :to="`/trading/recommendations?module=reports&entity=report-run&id=${run.retry_of_run_id}`"
          />
          <span v-else>—</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.quantReports.runs.outputReport')">
          <EntityRouteLink
            v-if="run.output_report_id"
            mono
            :label="run.output_report_id"
            :to="`/trading/recommendations?module=reports&entity=report&id=${run.output_report_id}`"
          />
          <span v-else>—</span>
        </DescriptionsItem>
      </Descriptions>
    </div>
  </WorkspaceObjectStage>
</template>
