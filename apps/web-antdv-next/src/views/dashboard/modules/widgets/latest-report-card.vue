<script lang="ts" setup>
import type { QuantReportDetailView } from '@vben/types';

import type { KeyValueGridItem } from '#/shared/components/key-value-grid.vue';

import { computed } from 'vue';

import { Alert, Button, Card, Empty, Skeleton, Tag } from 'antdv-next';

import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import { formatDateTimeLocal, formatUsd } from '#/shared/components/format';
import {
  findTagOption,
  useRecommendationReportStatusTagOptions,
} from '#/shared/components/format/tag-options';
import KeyValueGrid from '#/shared/components/key-value-grid.vue';

defineOptions({ name: 'LatestReportCard' });

const props = withDefaults(
  defineProps<{
    /** Stretch to fill a dashboard grid cell; keep false on standalone pages. */
    fill?: boolean;
    loading: boolean;
    report: null | QuantReportDetailView;
  }>(),
  { fill: false },
);

const emit = defineEmits<{
  navigateDetail: [reportId: string];
}>();

const statusTagOptions = useRecommendationReportStatusTagOptions();
const statusTag = computed(() =>
  props.report
    ? findTagOption(statusTagOptions, props.report.status)
    : undefined,
);

/** Detail API nests roll-ups under `summary`; list rows flatten them at top level. */
const publishedCount = computed(
  () =>
    props.report?.summary?.published_recommendation_count ??
    props.report?.published_recommendation_count ??
    0,
);
const totalSuggestedUsd = computed(
  () =>
    props.report?.summary?.total_suggested_usd ??
    props.report?.total_suggested_usd,
);

const statItems = computed<KeyValueGridItem[]>(() => [
  {
    key: 'published',
    label: $t('page.dashboard.latestReport.published'),
    value: String(publishedCount.value),
  },
  {
    key: 'suggested',
    label: $t('page.dashboard.latestReport.suggested'),
    value: formatUsd(totalSuggestedUsd.value),
  },
]);

function openDetail() {
  if (props.report) {
    emit('navigateDetail', props.report.recommendation_report_id);
  }
}

function onCardKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openDetail();
  }
}
</script>

<template>
  <DashboardPanel
    :fill="fill"
    :gap="fill ? 'md' : 'sm'"
    :title="$t('page.dashboard.latestReport.title')"
    icon="lucide:file-text"
    tone="indigo"
  >
    <template v-if="report" #extra>
      <Button size="small" type="link" @click.stop="openDetail">
        {{ $t('page.dashboard.viewAll') }}
      </Button>
    </template>
    <Skeleton v-if="loading && !report" :paragraph="{ rows: 3 }" active />
    <Card
      v-else-if="report"
      hoverable
      role="link"
      size="small"
      tabindex="0"
      @click="openDetail"
      @keydown="onCardKeydown"
    >
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <Tag :color="statusTag?.color ?? 'default'">
            {{ statusTag?.label ?? report.status }}
          </Tag>
          <span class="text-muted-foreground text-xs tabular-nums">
            {{ formatDateTimeLocal(report.as_of) }}
          </span>
        </div>
        <KeyValueGrid :bordered="false" :items="statItems" />
        <Alert
          v-if="report.status_reason"
          :message="report.status_reason"
          show-icon
          type="warning"
        />
      </div>
    </Card>
    <Empty
      v-else-if="!loading"
      :description="$t('page.dashboard.latestReport.none')"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />
  </DashboardPanel>
</template>
