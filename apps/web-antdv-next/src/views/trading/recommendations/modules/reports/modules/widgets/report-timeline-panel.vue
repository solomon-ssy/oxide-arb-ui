<script lang="ts" setup>
import type { OperationLogView } from '@vben/types';

import { onMounted, ref, watch } from 'vue';

import { useRequestHandler } from '@vben/request/qp';

import { Table, Tag } from 'antdv-next';

import { getReportTimeline } from '#/api/quant-reports';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import { centerTableColumns } from '#/shared/table/center-columns';
import { useQuantReportStore } from '#/store';

defineOptions({ name: 'ReportTimelinePanel' });

const props = defineProps<{ reportId: string }>();
const { handleRequest } = useRequestHandler();
const store = useQuantReportStore();
const rows = ref<OperationLogView[]>([]);
const loading = ref(false);
const page = ref(1);
const size = ref(20);
const total = ref(0);

const columns = [
  {
    dataIndex: 'occurred_at',
    key: 'occurred_at',
    title: $t('page.quantReports.timeline.time'),
  },
  {
    dataIndex: 'action',
    key: 'action',
    title: $t('page.quantReports.timeline.action'),
  },
  {
    dataIndex: 'actor_username',
    key: 'actor_username',
    title: $t('page.quantReports.timeline.actor'),
  },
  {
    dataIndex: 'acting_role',
    key: 'acting_role',
    title: $t('page.quantReports.timeline.role'),
  },
  {
    dataIndex: 'outcome',
    key: 'outcome',
    title: $t('page.quantReports.timeline.outcome'),
  },
  {
    dataIndex: 'request_id',
    key: 'request_id',
    title: $t('page.quantReports.timeline.requestId'),
  },
];

async function load() {
  loading.value = true;
  try {
    const result = await handleRequest(
      () =>
        getReportTimeline(props.reportId, {
          page: page.value,
          size: size.value,
        }),
      { silent: true },
    );
    rows.value = result?.items ?? [];
    total.value = result?.total ?? 0;
  } finally {
    loading.value = false;
  }
}

function changePage(nextPage: number, nextSize: number) {
  page.value = nextPage;
  size.value = nextSize;
}

watch(
  () => props.reportId,
  () => {
    if (page.value === 1) void load();
    else page.value = 1;
  },
);
watch(
  () => store.revision,
  () => void load(),
);
watch([page, size], () => void load());
onMounted(() => void load());
</script>

<template>
  <Table
    :columns="centerTableColumns(columns) ?? columns"
    :data-source="rows"
    data-testid="report-timeline"
    :loading="loading"
    :pagination="{
      current: page,
      pageSize: size,
      showSizeChanger: true,
      total,
    }"
    row-key="id"
    size="small"
    @change="
      (pagination) =>
        changePage(pagination.current ?? 1, pagination.pageSize ?? 20)
    "
  >
    <template #bodyCell="{ column, record }">
      <span v-if="column.key === 'occurred_at'">
        {{ formatDateTimeLocal(record.occurred_at) }}
      </span>
      <span v-else-if="column.key === 'actor_username'">
        {{ record.actor_username || 'system' }}
      </span>
      <span v-else-if="column.key === 'acting_role'">
        {{ record.acting_role || '—' }}
      </span>
      <Tag
        v-else-if="column.key === 'outcome'"
        :color="record.outcome === 'success' ? 'success' : 'error'"
      >
        {{ $t(`enum.operationOutcome.${record.outcome}`) }}
      </Tag>
      <span v-else-if="column.key === 'request_id'" class="font-mono text-xs">
        {{ record.request_id }}
      </span>
    </template>
  </Table>
</template>
