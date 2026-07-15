<script lang="ts" setup>
import type {
  FeatureIntegritySummaryView,
  FeatureParityEventView,
  FeatureParityRunView,
} from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';
import {
  FEATURE_PARITY_RUN_KINDS,
  FEATURE_PARITY_RUN_STATUSES,
} from '@vben/types';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  message,
  Spin,
  Statistic,
  TabPane,
  Tabs,
  Tag,
} from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  acknowledgeFeatureParityLatch,
  getFeatureIntegritySummary,
  listFeatureParityEvents,
  listFeatureParityRuns,
  runFullFeatureParity,
} from '#/api/research';
import { $t } from '#/locales';
import {
  EMPTY_PLACEHOLDER,
  formatDateTimeLocal,
  formatDurationSecs,
} from '#/shared/components/format';
import {
  findTagOption,
  useFeatureCellStateTagOptions,
  useFeatureParityRunStatusTagOptions,
} from '#/shared/components/format/tag-options';
import { timeRangeFromFormValues } from '#/shared/components/query/time-range';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useResearchStore } from '#/store';

import {
  canClearFeatureParityLatch,
  canRunFullFeatureParity,
  featureIntegrityRunIdFromQuery,
  featureIntegrityRunRoute,
} from './modules/feature-integrity-actions';
import ParityEventDrawer from './modules/parity-event-drawer.vue';
import ParityRunDrawer from './modules/parity-run-drawer.vue';
import ParityRunTrendChart from './modules/parity-run-trend-chart.vue';
import {
  isUninitializedLatch,
  recoveryRunCandidates,
  recoveryRunScope,
} from './modules/recovery-eligibility';
import RecoveryRunSelector from './modules/recovery-run-selector.vue';
import {
  useParityEventColumns,
  useParityEventSearchSchema,
  useParityRunColumns,
  useParityRunSearchSchema,
} from './modules/schemas';

defineOptions({ name: 'ResearchFeatureIntegrityPage' });

const route = useRoute();
const router = useRouter();
const { handleRequest } = useRequestHandler();
const { governed } = useGovernedAction();
const { hasAccessByCodes } = useQpAccess();
const researchStore = useResearchStore();
const featureCellStateOptions = useFeatureCellStateTagOptions();
const runStatusOptions = useFeatureParityRunStatusTagOptions();

const canMutate = hasAccessByCodes(['materialization:create']);
const summary = ref<FeatureIntegritySummaryView | null>(null);
const summaryLoading = ref(false);
const summaryError = ref(false);
const trendRuns = ref<FeatureParityRunView[]>([]);
const trendLoading = ref(false);
const trendError = ref(false);
const recoveryRuns = ref<FeatureParityRunView[]>([]);
const recoveryLoading = ref(false);
const recoveryError = ref(false);
const selectedRecoveryRunId = ref<string>();
const activeTab = ref('runs');

const TREND_RUN_LIMIT = 100;
const RECOVERY_RUN_LIMIT = 200;

const emptyRunPage = {
  has_next: false,
  items: [] as FeatureParityRunView[],
  page: 1,
  size: 0,
  total: 0,
};

const emptyEventPage = {
  has_next: false,
  items: [] as FeatureParityEventView[],
  page: 1,
  size: 0,
  total: 0,
};

const latch = computed(() => summary.value?.latch ?? null);
const recoveryCandidates = computed(() =>
  recoveryRunCandidates(latch.value, recoveryRuns.value),
);
const selectedRecoveryRun = computed(() =>
  recoveryCandidates.value.find(
    (run) => run.parity_run_id === selectedRecoveryRunId.value,
  ),
);
const canRunFull = computed(() =>
  canRunFullFeatureParity({
    hasPermission: canMutate,
    latch: latch.value,
    summaryAvailable: summary.value !== null,
    summaryLoading: summaryLoading.value,
  }),
);
const canAcknowledge = computed(() =>
  canClearFeatureParityLatch(canMutate, latch.value, selectedRecoveryRun.value),
);

const featureStateRows = computed(() =>
  Object.entries(summary.value?.feature_state_counts ?? {}),
);
const rejectionRows = computed(() =>
  Object.entries(summary.value?.rejection_reason_counts ?? {}),
);

const [EventDrawer, eventDrawerApi] = useVbenDrawer({
  connectedComponent: ParityEventDrawer,
  destroyOnClose: true,
});
const [RunDrawer, runDrawerApi] = useVbenDrawer({
  connectedComponent: ParityRunDrawer,
  destroyOnClose: true,
});

const [RunGrid, runGridApi] = useVbenVxeGrid<FeatureParityRunView>({
  formOptions: { schema: useParityRunSearchSchema() },
  gridOptions: {
    columns: useParityRunColumns(onRunAction),
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, unknown> = {},
        ) => {
          const { from, to } = timeRangeFromFormValues(formValues);
          const result = await handleRequest(() =>
            listFeatureParityRuns({
              from,
              kind:
                (formValues.kind as FeatureParityRunView['kind']) || undefined,
              page: page.currentPage,
              size: page.pageSize,
              status:
                (formValues.status as FeatureParityRunView['status']) ||
                undefined,
              to,
            }),
          );
          return result ?? emptyRunPage;
        },
      },
    },
    rowConfig: { keyField: 'parity_run_id' },
    sortConfig: { defaultSort: { field: 'created_at', order: 'desc' } },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

const [EventGrid, eventGridApi] = useVbenVxeGrid<FeatureParityEventView>({
  formOptions: { schema: useParityEventSearchSchema() },
  gridOptions: {
    columns: useParityEventColumns(onEventAction),
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, unknown> = {},
        ) => {
          const result = await handleRequest(() =>
            listFeatureParityEvents({
              feature_name: (formValues.feature_name as string) || undefined,
              page: page.currentPage,
              parity_run_id: (formValues.parity_run_id as string) || undefined,
              reason: (formValues.reason as string) || undefined,
              size: page.pageSize,
              stage:
                (formValues.stage as FeatureParityEventView['stage']) ||
                undefined,
              status:
                (formValues.status as FeatureParityEventView['status']) ||
                undefined,
            }),
          );
          return result ?? emptyEventPage;
        },
      },
    },
    rowConfig: { keyField: 'parity_event_id' },
    sortConfig: { defaultSort: { field: 'created_at', order: 'desc' } },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

async function loadSummary() {
  summaryLoading.value = true;
  summaryError.value = false;
  try {
    const result = await handleRequest(() => getFeatureIntegritySummary(), {
      silent: true,
      onError: () => {
        summaryError.value = true;
      },
    });
    summary.value = result ?? null;
  } finally {
    summaryLoading.value = false;
  }
}

async function loadTrendRuns() {
  trendLoading.value = true;
  trendError.value = false;
  try {
    const result = await handleRequest(
      () => listFeatureParityRuns({ page: 1, size: TREND_RUN_LIMIT }),
      {
        silent: true,
        onError: () => {
          trendError.value = true;
        },
      },
    );
    if (result) {
      trendRuns.value = result.items;
    }
  } finally {
    trendLoading.value = false;
  }
}

async function loadRecoveryRuns() {
  recoveryLoading.value = true;
  recoveryError.value = false;
  try {
    const result = await handleRequest(
      () =>
        listFeatureParityRuns({
          kind: FEATURE_PARITY_RUN_KINDS.full,
          page: 1,
          size: RECOVERY_RUN_LIMIT,
          status: FEATURE_PARITY_RUN_STATUSES.passed,
        }),
      {
        silent: true,
        onError: () => {
          recoveryError.value = true;
        },
      },
    );
    if (result) {
      recoveryRuns.value = result.items;
    }
  } finally {
    recoveryLoading.value = false;
  }
}

async function runFull() {
  const job = await governed(
    (ctx) => runFullFeatureParity({ reason: ctx.reason }, ctx),
    {
      summary: $t('page.research.featureIntegrity.fullRun.summary'),
      title: $t('page.research.featureIntegrity.fullRun.title'),
    },
  );
  if (job) {
    message.success($t('page.research.featureIntegrity.fullRun.feedback'));
    await router.push(`/research/jobs?open=${job.job_id}`);
  }
}

async function acknowledgeLatch() {
  const run = selectedRecoveryRun.value;
  if (!run || !canAcknowledge.value) {
    return;
  }
  const scope = recoveryRunScope(run);
  if (!scope) {
    return;
  }
  const details = [
    {
      label: $t('page.research.featureIntegrity.columns.runId'),
      mono: true,
      routeTo: featureIntegrityRunRoute(run.parity_run_id),
      value: run.parity_run_id,
    },
    {
      label: $t('page.research.featureIntegrity.recovery.scopeLabel'),
      value: $t(`page.research.featureIntegrity.recovery.scope.${scope}`),
    },
    {
      label: $t('page.research.featureIntegrity.recovery.window'),
      value: `${formatDateTimeLocal(run.window_start)} – ${formatDateTimeLocal(run.window_end)}`,
    },
  ];
  if (run.model_version_id) {
    details.push({
      label: $t('page.research.featureIntegrity.event.model'),
      mono: true,
      routeTo: `/research/models?open=${run.model_version_id}`,
      value: run.model_version_id,
    });
  }
  if (run.training_dataset_id) {
    details.push({
      label: $t('page.research.featureIntegrity.event.dataset'),
      mono: true,
      routeTo: `/research/datasets?open=${run.training_dataset_id}`,
      value: run.training_dataset_id,
    });
  }
  const acknowledged = await governed(
    (ctx) =>
      acknowledgeFeatureParityLatch(
        { parity_run_id: run.parity_run_id, reason: ctx.reason },
        ctx,
      ),
    {
      confirmWord: 'CLEAR',
      danger: true,
      details,
      summary: $t('page.research.featureIntegrity.acknowledge.summary'),
      title: $t('page.research.featureIntegrity.acknowledge.title'),
    },
  );
  if (acknowledged) {
    message.success($t('page.research.featureIntegrity.acknowledge.feedback'));
    await refreshAll();
  }
}

function showRunEvents(run: FeatureParityRunView) {
  activeTab.value = 'events';
  void eventGridApi.formApi.setValues({ parity_run_id: run.parity_run_id });
  void eventGridApi.query();
  void router.replace({
    query: { ...route.query, run_id: run.parity_run_id },
  });
}

function onRunAction({ code, row }: OnActionClickParams<FeatureParityRunView>) {
  switch (code) {
    case 'detail': {
      runDrawerApi.setData({ run: row }).open();
      break;
    }
    case 'events': {
      showRunEvents(row);
      break;
    }
    // No default
  }
}

function onEventAction({
  code,
  row,
}: OnActionClickParams<FeatureParityEventView>) {
  if (code === 'detail') {
    eventDrawerApi.setData({ event: row }).open();
  }
}

function applyRunDeepLink() {
  const runId = featureIntegrityRunIdFromQuery(route.query.run_id);
  if (!runId) {
    return;
  }
  activeTab.value = 'events';
  void eventGridApi.formApi.setValues({ parity_run_id: runId });
  void eventGridApi.query();
}

async function refreshAll() {
  await Promise.all([loadSummary(), loadTrendRuns(), loadRecoveryRuns()]);
  void runGridApi.query();
  void eventGridApi.query();
}

onMounted(() => {
  void Promise.all([loadSummary(), loadTrendRuns(), loadRecoveryRuns()]);
  applyRunDeepLink();
});
watch(() => route.query.run_id, applyRunDeepLink);
watch(recoveryCandidates, (candidates) => {
  if (
    selectedRecoveryRunId.value &&
    !candidates.some((run) => run.parity_run_id === selectedRecoveryRunId.value)
  ) {
    selectedRecoveryRunId.value = undefined;
  }
});
watch(
  () => researchStore.revision,
  () => void refreshAll(),
);
</script>

<template>
  <Page auto-content-height>
    <div class="mb-4 flex flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-lg font-semibold">
            {{ $t('page.research.featureIntegrity.title') }}
          </h2>
          <p class="text-muted-foreground text-sm">
            {{ $t('page.research.featureIntegrity.subtitle') }}
          </p>
        </div>
        <div v-if="canMutate" class="flex gap-2">
          <Button :disabled="!canRunFull" @click="runFull">
            {{ $t('page.research.featureIntegrity.actions.runFull') }}
          </Button>
          <Button danger :disabled="!canAcknowledge" @click="acknowledgeLatch">
            {{ $t('page.research.featureIntegrity.actions.clearLatch') }}
          </Button>
        </div>
      </div>

      <Alert
        v-if="latch?.open"
        :description="latch.reason || undefined"
        :message="$t('page.research.featureIntegrity.latch.open')"
        show-icon
        type="error"
      />
      <Alert
        v-else-if="summary && !latch?.open"
        :message="$t('page.research.featureIntegrity.latch.closed')"
        show-icon
        type="success"
      />
      <Card v-if="latch?.open" size="small">
        <Descriptions :column="2" bordered size="small">
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.latch.blockingRun')"
          >
            <span v-if="!latch.blocking_run_id">—</span>
            <RouterLink
              v-else
              class="font-mono text-xs break-all"
              :to="featureIntegrityRunRoute(latch.blocking_run_id)"
            >
              {{ latch.blocking_run_id }}
            </RouterLink>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.latch.openedAt')"
          >
            {{ formatDateTimeLocal(latch.opened_at) }}
          </DescriptionsItem>
        </Descriptions>
      </Card>
      <RecoveryRunSelector
        v-if="latch?.open"
        v-model="selectedRecoveryRunId"
        :bootstrap="isUninitializedLatch(latch)"
        :candidates="recoveryCandidates"
        :error="recoveryError"
        :loading="recoveryLoading"
      />
      <Alert
        v-if="latch?.open && !canAcknowledge"
        :message="$t('page.research.featureIntegrity.latch.recoveryBlocked')"
        show-icon
        type="warning"
      />
      <Alert
        v-if="summaryError"
        :message="$t('page.research.featureIntegrity.summaryLoadError')"
        show-icon
        type="warning"
      />

      <Spin :spinning="summaryLoading">
        <div
          v-if="summary"
          class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5"
        >
          <Card size="small">
            <Statistic
              :title="$t('page.research.featureIntegrity.summary.parityAge')"
              :value="
                summary.parity_age_secs === null ||
                summary.parity_age_secs === undefined
                  ? '—'
                  : formatDurationSecs(summary.parity_age_secs)
              "
            />
          </Card>
          <Card size="small">
            <Statistic
              :title="
                $t('page.research.featureIntegrity.summary.catalogCoverage')
              "
              :value="formatDateTimeLocal(summary.catalog_coverage_start)"
            />
          </Card>
          <Card size="small">
            <Statistic
              :title="
                $t('page.research.featureIntegrity.summary.catalogWatermark')
              "
              :value="formatDateTimeLocal(summary.catalog_watermark)"
            />
          </Card>
          <Card size="small">
            <Statistic
              :title="$t('page.research.featureIntegrity.summary.lastFull')"
              :value="formatDateTimeLocal(summary.last_full_run?.finished_at)"
            />
            <Tag
              v-if="summary.last_full_run"
              class="mt-2"
              :color="
                findTagOption(runStatusOptions, summary.last_full_run.status)
                  ?.color
              "
            >
              {{
                findTagOption(runStatusOptions, summary.last_full_run.status)
                  ?.label
              }}
            </Tag>
          </Card>
          <Card size="small">
            <Statistic
              :title="$t('page.research.featureIntegrity.summary.lastSampled')"
              :value="
                formatDateTimeLocal(summary.last_sampled_run?.finished_at)
              "
            />
            <Tag
              v-if="summary.last_sampled_run"
              class="mt-2"
              :color="
                findTagOption(runStatusOptions, summary.last_sampled_run.status)
                  ?.color
              "
            >
              {{
                findTagOption(runStatusOptions, summary.last_sampled_run.status)
                  ?.label
              }}
            </Tag>
          </Card>
        </div>
      </Spin>

      <ParityRunTrendChart
        :error="trendError"
        :loading="trendLoading"
        :runs="trendRuns"
      />

      <div v-if="summary" class="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card
          size="small"
          :title="$t('page.research.featureIntegrity.summary.featureStates')"
        >
          <Descriptions :column="2" bordered size="small">
            <DescriptionsItem
              v-for="[state, count] in featureStateRows"
              :key="state"
              :label="
                findTagOption(featureCellStateOptions, state)?.label ??
                EMPTY_PLACEHOLDER
              "
            >
              {{ count }}
            </DescriptionsItem>
          </Descriptions>
        </Card>
        <Card
          size="small"
          :title="$t('page.research.featureIntegrity.summary.rejections')"
        >
          <Descriptions :column="2" bordered size="small">
            <DescriptionsItem
              v-for="[reason, count] in rejectionRows"
              :key="reason"
              :label="reason"
            >
              {{ count }}
            </DescriptionsItem>
          </Descriptions>
        </Card>
      </div>
    </div>

    <Tabs v-model:active-key="activeTab" destroy-on-hidden>
      <TabPane key="runs" :tab="$t('page.research.featureIntegrity.tabs.runs')">
        <RunGrid
          :table-title="$t('page.research.featureIntegrity.runsTitle')"
        />
      </TabPane>
      <TabPane
        key="events"
        :tab="$t('page.research.featureIntegrity.tabs.events')"
      >
        <EventGrid
          :table-title="$t('page.research.featureIntegrity.eventsTitle')"
        />
      </TabPane>
    </Tabs>
    <EventDrawer />
    <RunDrawer />
  </Page>
</template>
