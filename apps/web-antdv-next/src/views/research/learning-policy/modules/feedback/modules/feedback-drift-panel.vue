<script lang="ts" setup>
import type { TableColumnsType } from 'antdv-next';

import type { DriftReportView, Paginated } from '@vben/types';

import { computed } from 'vue';

import {
  Alert,
  Button,
  Empty,
  Pagination,
  Skeleton,
  Table,
  Tag,
} from 'antdv-next';

import { $t } from '#/locales';
import {
  formatDateTimeLocal,
  formatScore,
  truncateHexId,
} from '#/shared/components/format';

defineOptions({ name: 'FeedbackDriftPanel' });

defineProps<{
  currentPage: number;
  error: null | string;
  loading: boolean;
  page: Paginated<DriftReportView>;
}>();

const emit = defineEmits<{
  page: [page: number];
  retry: [];
}>();

const columns = computed<TableColumnsType<DriftReportView>>(() => [
  {
    dataIndex: 'drift_report_id',
    key: 'drift_report_id',
    title: $t('page.research.feedback.drift.report'),
    width: 150,
  },
  {
    dataIndex: 'kind',
    key: 'kind',
    title: $t('page.research.feedback.drift.kind'),
    width: 110,
  },
  {
    dataIndex: 'metric',
    key: 'metric',
    title: $t('page.research.feedback.drift.metric'),
  },
  {
    dataIndex: 'assessment',
    key: 'assessment',
    title: $t('page.research.feedback.drift.assessment'),
    width: 160,
  },
  {
    dataIndex: 'observed_value',
    key: 'observed_value',
    title: $t('page.research.feedback.drift.observed'),
    width: 120,
  },
  {
    dataIndex: 'threshold',
    key: 'threshold',
    title: $t('page.research.feedback.drift.threshold'),
    width: 120,
  },
  {
    dataIndex: 'sample_count',
    key: 'sample_count',
    title: $t('page.research.feedback.drift.samples'),
    width: 100,
  },
  {
    dataIndex: 'observed_at',
    key: 'observed_at',
    title: $t('page.research.feedback.drift.observedAt'),
    width: 180,
  },
]);

function assessmentColor(value: DriftReportView['assessment']) {
  if (value === 'threshold_exceeded') return 'error';
  if (value === 'within_threshold') return 'success';
  return 'warning';
}
</script>

<template>
  <section aria-labelledby="drift-report-title">
    <div class="mb-4">
      <h2 id="drift-report-title" class="text-base font-semibold">
        {{ $t('page.research.feedback.drift.title') }}
      </h2>
      <p class="text-muted-foreground mt-1 text-sm">
        {{ $t('page.research.feedback.drift.description') }}
      </p>
    </div>

    <Alert
      v-if="error"
      class="mb-4"
      :description="error"
      :message="$t('page.research.feedback.drift.loadError')"
      show-icon
      type="error"
    >
      <template #action>
        <Button size="small" @click="emit('retry')">
          {{ $t('page.research.feedback.retry') }}
        </Button>
      </template>
    </Alert>

    <Skeleton
      v-if="loading && page.items.length === 0"
      active
      :paragraph="{ rows: 10 }"
    />
    <Empty
      v-else-if="page.items.length === 0"
      :description="$t('page.research.feedback.drift.empty')"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />
    <template v-else>
      <Table
        :columns="columns"
        :data-source="page.items"
        :loading="loading"
        :pagination="false"
        row-key="drift_report_id"
        :scroll="{ x: 1160 }"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <span
            v-if="column.key === 'drift_report_id'"
            class="font-mono text-xs"
          >
            {{ truncateHexId(record.drift_report_id, 8, 6) }}
          </span>
          <Tag v-else-if="column.key === 'kind'">
            {{ $t(`page.research.feedback.drift.kindValue.${record.kind}`) }}
          </Tag>
          <span v-else-if="column.key === 'metric'">
            {{
              $t(`page.research.feedback.drift.metricValue.${record.metric}`)
            }}
          </span>
          <Tag
            v-else-if="column.key === 'assessment'"
            :color="assessmentColor(record.assessment)"
          >
            {{
              $t(
                `page.research.feedback.drift.assessmentValue.${record.assessment}`,
              )
            }}
          </Tag>
          <span
            v-else-if="column.key === 'observed_value'"
            class="font-mono tabular-nums"
          >
            {{ formatScore(record.observed_value) }}
          </span>
          <span
            v-else-if="column.key === 'threshold'"
            class="font-mono tabular-nums"
          >
            {{ formatScore(record.threshold) }}
          </span>
          <span v-else-if="column.key === 'observed_at'">
            {{ formatDateTimeLocal(record.observed_at) }}
          </span>
        </template>
      </Table>
      <div v-if="page.total > page.size" class="mt-4 flex justify-end">
        <Pagination
          :current="currentPage"
          :page-size="page.size"
          :show-size-changer="false"
          :total="page.total"
          @change="emit('page', $event)"
        />
      </div>
    </template>
  </section>
</template>
