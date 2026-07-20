<script lang="ts" setup>
import type {
  ReportSchedule,
  ReportScheduleConfig,
  ScheduleCadence,
} from '@vben/types/config-api';

import { onScopeDispose, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Alert, Skeleton, Tag } from 'antdv-next';

import { previewConfigSchedule } from '#/api/config';
import { $t } from '#/locales';
import {
  formatDateTimeLocal,
  formatDateTimeUtc,
} from '#/shared/components/format';

defineOptions({ name: 'ConfigReportSchedulePreview' });

const props = defineProps<{
  modelValue: ReportSchedule;
}>();

type PreviewStatus = 'disabled' | 'failed' | 'ready';

interface SchedulePreviewRow {
  cadence: ScheduleCadence;
  fireTimes: string[];
  id: string;
  status: PreviewStatus;
}

const PREVIEW_COUNT = 5;
const PREVIEW_DEBOUNCE_MS = 220;

const loading = ref(false);
const rows = ref<SchedulePreviewRow[]>([]);
let previewGeneration = 0;
let previewTimer: number | undefined;

const operatorTimeZone =
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

function resolvedCadence(schedule: ReportScheduleConfig) {
  return schedule.cadence ?? null;
}

function scheduleId(schedule: ReportScheduleConfig, index: number) {
  return schedule.schedule_id?.trim() || `schedule-${index + 1}`;
}

function cadenceLabel(cadence: ScheduleCadence) {
  if (cadence.kind === 'interval') {
    return $t('page.config.reportSchedulePreview.interval', {
      seconds: cadence.interval_secs,
    });
  }
  return $t('page.config.reportSchedulePreview.cron', {
    expression: cadence.expr,
    timezone: cadence.timezone ?? 'UTC',
  });
}

async function loadPreviews() {
  const generation = ++previewGeneration;
  const schedules = props.modelValue.schedules ?? [];
  loading.value = true;

  const nextRows = await Promise.all(
    schedules.flatMap((schedule, index) => {
      const cadence = resolvedCadence(schedule);
      if (!cadence) return [];
      if (schedule.enabled === false) {
        return [
          Promise.resolve<SchedulePreviewRow>({
            cadence,
            fireTimes: [],
            id: scheduleId(schedule, index),
            status: 'disabled',
          }),
        ];
      }
      return [
        previewConfigSchedule({ cadence, count: PREVIEW_COUNT })
          .then<SchedulePreviewRow>((preview) => ({
            cadence,
            fireTimes: preview.next_fire_times,
            id: scheduleId(schedule, index),
            status: 'ready',
          }))
          .catch<SchedulePreviewRow>(() => ({
            cadence,
            fireTimes: [],
            id: scheduleId(schedule, index),
            status: 'failed',
          })),
      ];
    }),
  );

  if (generation === previewGeneration) {
    rows.value = nextRows;
    loading.value = false;
  }
}

function schedulePreviewLoad() {
  if (previewTimer !== undefined) window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(
    () => void loadPreviews(),
    PREVIEW_DEBOUNCE_MS,
  );
}

watch(() => props.modelValue.schedules, schedulePreviewLoad, {
  deep: true,
  immediate: true,
});

onScopeDispose(() => {
  previewGeneration += 1;
  if (previewTimer !== undefined) window.clearTimeout(previewTimer);
});
</script>

<template>
  <section
    class="bg-card rounded-xl border p-5"
    aria-live="polite"
    data-testid="config-report-schedule-preview"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <IconifyIcon
            class="text-primary size-5"
            icon="lucide:calendar-clock"
          />
          <h2 class="text-base font-semibold">
            {{ $t('page.config.reportSchedulePreview.title') }}
          </h2>
        </div>
        <p class="text-muted-foreground mt-1 text-sm">
          {{ $t('page.config.reportSchedulePreview.description') }}
        </p>
      </div>
      <Tag>
        {{
          $t('page.config.reportSchedulePreview.operatorTimezone', {
            timezone: operatorTimeZone,
          })
        }}
      </Tag>
    </div>

    <Skeleton v-if="loading" class="mt-4" :paragraph="{ rows: 3 }" active />
    <Alert
      v-else-if="rows.length === 0"
      class="mt-4"
      :message="$t('page.config.reportSchedulePreview.empty')"
      show-icon
      type="info"
    />
    <div v-else class="mt-4 grid gap-3">
      <article
        v-for="row in rows"
        :key="row.id"
        class="rounded-lg border px-4 py-3"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="text-sm font-semibold">{{ row.id }}</h3>
            <p class="text-muted-foreground mt-0.5 text-xs">
              {{ cadenceLabel(row.cadence) }}
            </p>
          </div>
          <Tag :color="row.status === 'ready' ? 'success' : undefined">
            {{ $t(`page.config.reportSchedulePreview.status.${row.status}`) }}
          </Tag>
        </div>

        <Alert
          v-if="row.status === 'failed'"
          class="mt-3"
          :message="$t('page.config.reportSchedulePreview.failed')"
          show-icon
          type="error"
        />
        <ol
          v-else-if="row.status === 'ready'"
          class="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5"
        >
          <li
            v-for="(fireTime, index) in row.fireTimes"
            :key="fireTime"
            class="bg-muted/45 rounded-md px-3 py-2"
          >
            <span class="text-muted-foreground block text-xs">
              {{
                $t('page.config.reportSchedulePreview.occurrence', {
                  index: index + 1,
                })
              }}
            </span>
            <time
              class="mt-0.5 block text-xs font-medium"
              data-screenshot-volatile="true"
              :datetime="fireTime"
              :title="formatDateTimeUtc(fireTime)"
            >
              {{ formatDateTimeLocal(fireTime) }}
            </time>
          </li>
        </ol>
      </article>
    </div>
  </section>
</template>
