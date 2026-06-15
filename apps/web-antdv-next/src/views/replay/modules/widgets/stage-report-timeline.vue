<script lang="ts" setup>
import type { ControlFactorStageReportView } from '@vben/types';

import { computed } from 'vue';

import { Empty, Spin, Tag, Timeline, TimelineItem } from 'antdv-next';

import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';

defineOptions({ name: 'StageReportTimeline' });

const props = withDefaults(
  defineProps<{
    items: ControlFactorStageReportView[];
    loading?: boolean;
  }>(),
  { loading: false },
);

const ordered = computed(() =>
  props.items.toSorted(
    (a, b) => Date.parse(a.started_at) - Date.parse(b.started_at),
  ),
);

const STAGE_STATUS_COLOR: Record<string, string> = {
  completed: 'success',
  completed_with_warnings: 'warning',
  failed: 'error',
  insufficient_coverage: 'warning',
  pending: 'default',
  production_ineligible: 'default',
  running: 'processing',
  skipped_not_required: 'default',
};
</script>

<template>
  <Spin :spinning="loading">
    <Empty
      v-if="ordered.length === 0 && !loading"
      :description="$t('page.replay.detail.stagesEmpty')"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />
    <Timeline v-else>
      <TimelineItem
        v-for="row in ordered"
        :key="row.stage_report_id"
        :color="STAGE_STATUS_COLOR[row.status] ?? 'blue'"
      >
        <div class="flex flex-col gap-1 pb-2">
          <div class="flex flex-wrap items-center gap-2">
            <Tag :color="STAGE_STATUS_COLOR[row.status] ?? 'default'">
              {{ $t(`enum.materializationStageName.${row.stage_name}`) }}
            </Tag>
            <Tag>
              {{ $t(`enum.evidenceStageStatus.${row.status}`) }}
            </Tag>
            <span class="text-muted-foreground text-xs tabular-nums">
              {{ formatDateTimeLocal(row.started_at) }}
              <template v-if="row.finished_at">
                → {{ formatDateTimeLocal(row.finished_at) }}
              </template>
            </span>
          </div>
          <div class="text-muted-foreground font-mono text-xs tabular-nums">
            read {{ row.records_read }} · write {{ row.records_written }}
          </div>
        </div>
      </TimelineItem>
    </Timeline>
  </Spin>
</template>
