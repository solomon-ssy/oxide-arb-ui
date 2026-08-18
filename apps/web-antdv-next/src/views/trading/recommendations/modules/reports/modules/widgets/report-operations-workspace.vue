<script lang="ts" setup>
import type {
  ReportRunStatus,
  ReportRunView,
  ReportScheduleGapView,
  ReportScheduleHealthView,
} from '@vben/types';

import { computed, onMounted, ref, watch } from 'vue';

import { useRequestHandler } from '@vben/request/qp';

import { Button, Card, Col, Row, Statistic, Table, Tag } from 'antdv-next';

import {
  getReportScheduleHealth,
  listReportRuns,
  listReportScheduleGaps,
} from '#/api/quant-reports';
import { $t } from '#/locales';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import { formatDateTimeLocal } from '#/shared/components/format';
import { centerTableColumns } from '#/shared/table/center-columns';
import { useQuantReportStore } from '#/store';

defineOptions({ name: 'ReportOperationsWorkspace' });

const emit = defineEmits<{ openRun: [id: string] }>();
const { handleRequest } = useRequestHandler();
const store = useQuantReportStore();
const health = ref<null | ReportScheduleHealthView>(null);
const runs = ref<ReportRunView[]>([]);
const gaps = ref<ReportScheduleGapView[]>([]);
const loading = ref(false);
const runPage = ref(1);
const runSize = ref(20);
const runTotal = ref(0);
const gapPage = ref(1);
const gapSize = ref(20);
const gapTotal = ref(0);

const nextTrigger = computed(() => {
  const enabled = (health.value?.schedules ?? [])
    .filter((schedule) => schedule.enabled)
    .map((schedule) => schedule.next_scheduled_for)
    .toSorted();
  return enabled[0] ?? null;
});
const currentReport = computed(() => health.value?.current_reports[0] ?? null);
const nextCurrentExpiry = computed(() => {
  const validUntil = (health.value?.current_reports ?? [])
    .map((report) => report.valid_until)
    .filter((value): value is string => value !== null)
    .toSorted();
  return validUntil[0] ?? null;
});

const statusColor: Record<ReportRunStatus, string> = {
  abandoned: 'error',
  failed: 'error',
  queued: 'default',
  running: 'processing',
  skipped: 'warning',
  succeeded: 'success',
};

const runColumns = [
  {
    dataIndex: 'status',
    key: 'status',
    title: $t('page.quantReports.columns.status'),
  },
  {
    dataIndex: 'trigger_kind',
    key: 'trigger_kind',
    title: $t('page.quantReports.columns.triggerKind'),
  },
  {
    dataIndex: 'schedule_id',
    key: 'schedule_id',
    title: $t('page.quantReports.runs.schedule'),
  },
  {
    dataIndex: 'requested_at',
    key: 'requested_at',
    title: $t('page.quantReports.runs.requestedAt'),
  },
  {
    dataIndex: 'decision_at',
    key: 'decision_at',
    title: $t('page.quantReports.runs.decisionAt'),
  },
  {
    dataIndex: 'terminal_reason',
    key: 'terminal_reason',
    title: $t('page.quantReports.runs.terminalReason'),
  },
  { key: 'action', title: $t('page.quantReports.columns.operation') },
];

const scheduleColumns = [
  {
    dataIndex: 'schedule_id',
    key: 'schedule_id',
    title: $t('page.quantReports.runs.schedule'),
  },
  {
    dataIndex: 'enabled',
    key: 'enabled',
    title: $t('page.quantReports.health.enabled'),
  },
  {
    dataIndex: 'next_scheduled_for',
    key: 'next_scheduled_for',
    title: $t('page.quantReports.health.nextFire'),
  },
  {
    dataIndex: 'last_materialized_for',
    key: 'last_materialized_for',
    title: $t('page.quantReports.health.lastMaterialized'),
  },
];

const gapColumns = [
  {
    dataIndex: 'schedule_id',
    key: 'schedule_id',
    title: $t('page.quantReports.runs.schedule'),
  },
  {
    dataIndex: 'reason',
    key: 'reason',
    title: $t('page.quantReports.health.gapReason'),
  },
  {
    dataIndex: 'missed_count',
    key: 'missed_count',
    title: $t('page.quantReports.health.missed'),
  },
  {
    dataIndex: 'first_scheduled_for',
    key: 'first_scheduled_for',
    title: $t('page.quantReports.health.firstOccurrence'),
  },
  {
    dataIndex: 'last_scheduled_for',
    key: 'last_scheduled_for',
    title: $t('page.quantReports.health.lastOccurrence'),
  },
  {
    dataIndex: 'detected_at',
    key: 'detected_at',
    title: $t('page.quantReports.health.detectedAt'),
  },
];

async function load() {
  loading.value = true;
  try {
    const result = await handleRequest(
      async () => {
        const [nextHealth, nextRunPage, nextGapPage] = await Promise.all([
          getReportScheduleHealth(),
          listReportRuns({ page: runPage.value, size: runSize.value }),
          listReportScheduleGaps({ page: gapPage.value, size: gapSize.value }),
        ]);
        return { nextGapPage, nextHealth, nextRunPage };
      },
      { silent: true },
    );
    health.value = result?.nextHealth ?? null;
    runs.value = result?.nextRunPage.items ?? [];
    runTotal.value = result?.nextRunPage.total ?? 0;
    gaps.value = result?.nextGapPage.items ?? [];
    gapTotal.value = result?.nextGapPage.total ?? 0;
  } finally {
    loading.value = false;
  }
}

function changeRunPage(nextPage: number, nextSize: number) {
  runPage.value = nextPage;
  runSize.value = nextSize;
}

function changeGapPage(nextPage: number, nextSize: number) {
  gapPage.value = nextPage;
  gapSize.value = nextSize;
}

function gapTime(record: ReportScheduleGapView, key: unknown) {
  if (key === 'first_scheduled_for') return record.first_scheduled_for;
  if (key === 'last_scheduled_for') return record.last_scheduled_for;
  return record.detected_at;
}

watch(
  () => store.runRevision,
  () => void load(),
);
watch(
  () => store.revision,
  () => void load(),
);
watch([runPage, runSize, gapPage, gapSize], () => void load());
onMounted(() => void load());
</script>

<template>
  <div class="flex flex-col gap-4" data-testid="report-operations-workspace">
    <Row :gutter="[12, 12]">
      <Col :lg="8" :sm="12" :xs="24">
        <Card data-testid="report-current-authority" size="small">
          <div class="text-muted-foreground text-xs">
            {{ $t('page.quantReports.health.currentAuthority') }}
          </div>
          <div
            v-if="health?.current_reports.length"
            class="mt-2 flex flex-col gap-2"
          >
            <div
              v-for="current in health.current_reports"
              :key="current.recommendation_report_id"
              class="flex flex-col gap-1"
            >
              <EntityRouteLink
                mono
                :label="current.recommendation_report_id"
                :to="`/trading/recommendations?module=queue&entity=report&id=${current.recommendation_report_id}`"
              />
              <span class="text-muted-foreground text-xs">
                {{ $t(`enum.reportKind.${current.report_kind}`) }}
              </span>
            </div>
          </div>
          <span v-else class="text-muted-foreground mt-2 block text-sm">
            {{ $t('page.quantReports.health.noCurrent') }}
          </span>
        </Card>
      </Col>
      <Col :lg="8" :sm="12" :xs="24">
        <Card size="small">
          <Statistic
            :title="$t('page.quantReports.health.validUntil')"
            :value="formatDateTimeLocal(nextCurrentExpiry)"
          />
        </Card>
      </Col>
      <Col :lg="8" :sm="12" :xs="24">
        <Card size="small">
          <Statistic
            :title="$t('page.quantReports.health.activeRun')"
            :value="
              health?.active_run
                ? $t(`enum.reportRunStatus.${health.active_run.status}`)
                : '—'
            "
          />
        </Card>
      </Col>
      <Col :lg="8" :sm="12" :xs="24">
        <Card size="small">
          <Statistic
            :title="$t('page.quantReports.health.queuedPrepared')"
            :value="`${health?.queued_run_count ?? 0} / ${health?.prepared_report_count ?? 0}`"
          />
        </Card>
      </Col>
      <Col :lg="8" :sm="12" :xs="24">
        <Card size="small">
          <Statistic
            :title="$t('page.quantReports.health.lastPublished')"
            :value="formatDateTimeLocal(currentReport?.published_at)"
          />
        </Card>
      </Col>
      <Col :lg="8" :sm="12" :xs="24">
        <Card size="small">
          <Statistic
            :title="$t('page.quantReports.health.failuresAndGaps')"
            :value="`${health?.failed_run_count_24h ?? 0} / ${health?.gap_count_24h ?? 0}`"
          />
        </Card>
      </Col>
      <Col :lg="8" :sm="12" :xs="24">
        <Card size="small">
          <Statistic
            :title="$t('page.quantReports.health.nextFire')"
            :value="formatDateTimeLocal(nextTrigger)"
          />
        </Card>
      </Col>
    </Row>

    <Card size="small" :title="$t('page.quantReports.health.schedules')">
      <Table
        :columns="centerTableColumns(scheduleColumns) ?? scheduleColumns"
        :data-source="health?.schedules ?? []"
        :loading="loading"
        :pagination="false"
        row-key="schedule_id"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <Tag
            v-if="column.key === 'enabled'"
            :color="record.enabled ? 'success' : 'default'"
          >
            {{ record.enabled ? $t('page.common.yes') : $t('page.common.no') }}
          </Tag>
          <span
            v-else-if="
              column.key === 'next_scheduled_for' ||
              column.key === 'last_materialized_for'
            "
          >
            {{ formatDateTimeLocal(record[column.key]) }}
          </span>
        </template>
      </Table>
    </Card>

    <Card size="small" :title="$t('page.quantReports.runs.title')">
      <Table
        :columns="centerTableColumns(runColumns) ?? runColumns"
        :data-source="runs"
        data-testid="report-run-ledger"
        :loading="loading"
        :pagination="{
          current: runPage,
          pageSize: runSize,
          showSizeChanger: true,
          total: runTotal,
        }"
        row-key="report_run_id"
        size="small"
        @change="
          (pagination) =>
            changeRunPage(pagination.current ?? 1, pagination.pageSize ?? 20)
        "
      >
        <template #bodyCell="{ column, record }">
          <Tag
            v-if="column.key === 'status'"
            :color="statusColor[record.status]"
          >
            {{ $t(`enum.reportRunStatus.${record.status}`) }}
          </Tag>
          <span v-else-if="column.key === 'trigger_kind'">
            {{ $t(`enum.reportTriggerKind.${record.trigger_kind}`) }}
          </span>
          <span
            v-else-if="
              column.key === 'requested_at' || column.key === 'decision_at'
            "
          >
            {{ formatDateTimeLocal(record[column.key]) }}
          </span>
          <span v-else-if="column.key === 'terminal_reason'">
            {{
              record.terminal_reason
                ? $t(`enum.reportRunTerminalReason.${record.terminal_reason}`)
                : '—'
            }}
          </span>
          <Button
            v-else-if="column.key === 'action'"
            data-testid="report-run-detail"
            size="small"
            type="link"
            @click="emit('openRun', record.report_run_id)"
          >
            {{ $t('page.quantReports.actions.detail') }}
          </Button>
        </template>
      </Table>
    </Card>

    <Card size="small" :title="$t('page.quantReports.health.gaps')">
      <Table
        :columns="centerTableColumns(gapColumns) ?? gapColumns"
        :data-source="gaps"
        :loading="loading"
        :pagination="{
          current: gapPage,
          pageSize: gapSize,
          showSizeChanger: true,
          total: gapTotal,
        }"
        row-key="gap_id"
        size="small"
        @change="
          (pagination) =>
            changeGapPage(pagination.current ?? 1, pagination.pageSize ?? 20)
        "
      >
        <template #bodyCell="{ column, record }">
          <span v-if="column.key === 'reason'">
            {{ $t(`enum.reportScheduleGapReason.${record.reason}`) }}
          </span>
          <span
            v-else-if="
              [
                'first_scheduled_for',
                'last_scheduled_for',
                'detected_at',
              ].includes(String(column.key))
            "
          >
            {{ formatDateTimeLocal(gapTime(record, column.key)) }}
          </span>
        </template>
      </Table>
    </Card>
  </div>
</template>
