<script lang="ts" setup>
import type { QuantReportDetailView } from '@vben/types';

import { computed } from 'vue';

import { Alert, Button, Empty, Tag } from 'antdv-next';

import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import { formatDateTimeLocal, formatUsd } from '#/shared/components/format';
import {
  findTagOption,
  useRecommendationReportStatusTagOptions,
} from '#/shared/components/format/tag-options';

defineOptions({ name: 'LatestReportCard' });

const props = defineProps<{
  loading: boolean;
  report: null | QuantReportDetailView;
}>();

const emit = defineEmits<{
  navigateDetail: [reportId: string];
  navigateList: [];
}>();

const statusTagOptions = useRecommendationReportStatusTagOptions();
const statusTag = computed(() =>
  props.report
    ? findTagOption(statusTagOptions, props.report.status)
    : undefined,
);

function openDetail() {
  if (props.report) {
    emit('navigateDetail', props.report.recommendation_report_id);
  }
}
</script>

<template>
  <DashboardPanel
    :title="$t('page.dashboard.latestReport.title')"
    icon="lucide:file-text"
    tone="indigo"
    fill
  >
    <template #extra>
      <Button size="small" type="link" @click="emit('navigateList')">
        {{ $t('page.dashboard.viewAll') }}
      </Button>
    </template>
    <div
      v-if="report"
      class="flex cursor-pointer flex-col gap-2"
      @click="openDetail"
    >
      <div class="flex items-center justify-between gap-2">
        <Tag :color="statusTag?.color ?? 'default'">
          {{ statusTag?.label ?? report.status }}
        </Tag>
        <span class="text-muted-foreground text-xs tabular-nums">
          {{ formatDateTimeLocal(report.as_of) }}
        </span>
      </div>
      <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <span class="text-muted-foreground">
          {{ $t('page.dashboard.latestReport.published') }}
        </span>
        <span class="text-right font-medium tabular-nums">
          {{ report.published_recommendation_count }}
        </span>
        <span class="text-muted-foreground">
          {{ $t('page.dashboard.latestReport.suggested') }}
        </span>
        <span class="text-right font-medium tabular-nums">
          {{ formatUsd(report.total_suggested_usd) }}
        </span>
      </div>
      <Alert
        v-if="report.status_reason"
        :message="report.status_reason"
        show-icon
        type="warning"
      />
    </div>
    <Empty
      v-else-if="!loading"
      :description="$t('page.dashboard.latestReport.none')"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />
  </DashboardPanel>
</template>
