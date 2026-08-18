<script lang="ts" setup>
import type {
  ReportScheduleConfig,
  ScheduleCadence,
} from '@vben/types/config-api';

import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Checkbox, Input, InputNumber, Select, Tag } from 'antdv-next';

import { $t } from '#/locales';

defineOptions({ name: 'ReportScheduleListControl' });

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    modelValue: unknown;
  }>(),
  { disabled: false },
);

const emit = defineEmits<{
  'update:modelValue': [value: ReportScheduleConfig[]];
}>();

const schedules = computed<ReportScheduleConfig[]>(() =>
  Array.isArray(props.modelValue)
    ? (props.modelValue as ReportScheduleConfig[])
    : [],
);

const cadenceOptions = [
  { label: $t('page.config.enumValue.interval'), value: 'interval' },
  { label: $t('page.config.enumValue.cron'), value: 'cron' },
];

function cadenceKind(cadence: ScheduleCadence | undefined) {
  return cadence?.kind ?? 'interval';
}

function updateSchedule(index: number, patch: Partial<ReportScheduleConfig>) {
  const next = structuredClone(schedules.value);
  const current = next[index];
  if (!current) return;
  next[index] = { ...current, ...patch };
  emit('update:modelValue', next);
}

function updateCadence(
  index: number,
  patch: Partial<Extract<ScheduleCadence, { kind: 'cron' }>> &
    Partial<Extract<ScheduleCadence, { kind: 'interval' }>>,
) {
  const current = schedules.value[index]?.cadence ?? {
    interval_secs: 3600,
    kind: 'interval' as const,
  };
  updateSchedule(index, {
    cadence: { ...current, ...patch } as ScheduleCadence,
  });
}

function switchCadence(index: number, kind: unknown) {
  if (kind === 'cron') {
    updateSchedule(index, {
      cadence: { expr: '0 0 * * * *', kind, timezone: 'UTC' },
    });
  } else if (kind === 'interval') {
    updateSchedule(index, { cadence: { interval_secs: 3600, kind } });
  }
}

function updateEnabled(index: number, event: unknown) {
  if (
    typeof event === 'object' &&
    event !== null &&
    'target' in event &&
    typeof event.target === 'object' &&
    event.target !== null &&
    'checked' in event.target
  ) {
    updateSchedule(index, { enabled: Boolean(event.target.checked) });
  }
}

function addSchedule() {
  emit('update:modelValue', [
    ...structuredClone(schedules.value),
    {
      cadence: { interval_secs: 3600, kind: 'interval' },
      enabled: true,
      knowledge_lag_secs: 10,
      schedule_id: `schedule_${schedules.value.length + 1}`,
      top_n: 20,
    },
  ]);
}

function removeSchedule(index: number) {
  emit(
    'update:modelValue',
    schedules.value.filter((_, scheduleIndex) => scheduleIndex !== index),
  );
}
</script>

<template>
  <div class="space-y-3">
    <article
      v-for="(schedule, index) in schedules"
      :key="`${index}:${schedule.schedule_id}`"
      class="schedule-card"
    >
      <header class="flex items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2">
          <Tag>{{ index + 1 }}</Tag>
          <strong class="truncate text-sm">
            {{
              schedule.schedule_id ||
              $t('page.config.editor.item', { index: index + 1 })
            }}
          </strong>
        </div>
        <Button
          :aria-label="$t('page.config.editor.removeItem')"
          :disabled="disabled"
          danger
          shape="circle"
          type="text"
          @click="removeSchedule(index)"
        >
          <IconifyIcon icon="lucide:trash-2" />
        </Button>
      </header>

      <div class="schedule-grid mt-3">
        <label class="schedule-field">
          <span>{{ $t('page.config.editor.scheduleId') }}</span>
          <Input
            :disabled="disabled"
            :value="schedule.schedule_id"
            @update:value="updateSchedule(index, { schedule_id: $event })"
          />
        </label>
        <label class="schedule-field">
          <span>{{ $t('page.config.editor.topN') }}</span>
          <InputNumber
            :disabled="disabled"
            :min="1"
            :precision="0"
            :value="schedule.top_n"
            class="w-full"
            @update:value="
              typeof $event === 'number' &&
              updateSchedule(index, { top_n: $event })
            "
          />
        </label>
        <label class="schedule-field">
          <span>{{ $t('page.config.editor.knowledgeLag') }}</span>
          <InputNumber
            :disabled="disabled"
            :min="0"
            :precision="0"
            :value="schedule.knowledge_lag_secs"
            class="w-full"
            @update:value="
              typeof $event === 'number' &&
              updateSchedule(index, { knowledge_lag_secs: $event })
            "
          />
        </label>
        <label class="schedule-field">
          <span>{{ $t('page.config.editor.cadence') }}</span>
          <Select
            :disabled="disabled"
            :options="cadenceOptions"
            :value="cadenceKind(schedule.cadence)"
            @update:value="switchCadence(index, $event)"
          />
        </label>

        <label
          v-if="schedule.cadence?.kind === 'interval'"
          class="schedule-field schedule-field--wide"
        >
          <span>{{ $t('page.config.editor.interval') }}</span>
          <InputNumber
            :disabled="disabled"
            :min="1"
            :precision="0"
            :value="schedule.cadence.interval_secs"
            class="w-full"
            @update:value="
              typeof $event === 'number' &&
              updateCadence(index, { interval_secs: $event })
            "
          />
        </label>
        <template v-else-if="schedule.cadence?.kind === 'cron'">
          <label class="schedule-field">
            <span>{{ $t('page.config.editor.cronExpression') }}</span>
            <Input
              :disabled="disabled"
              :value="schedule.cadence.expr"
              @update:value="updateCadence(index, { expr: $event })"
            />
          </label>
          <label class="schedule-field">
            <span>{{ $t('page.config.editor.timezone') }}</span>
            <Input
              :disabled="disabled"
              :value="schedule.cadence.timezone ?? ''"
              @update:value="updateCadence(index, { timezone: $event || null })"
            />
          </label>
        </template>

        <Checkbox
          class="schedule-field--wide"
          :checked="schedule.enabled"
          :disabled="disabled"
          @change="updateEnabled(index, $event)"
        >
          {{ $t('page.config.editor.enabled') }}
        </Checkbox>
      </div>
    </article>

    <Button :disabled="disabled" type="dashed" block @click="addSchedule">
      <IconifyIcon icon="lucide:plus" />
      {{ $t('page.config.editor.addItem') }}
    </Button>
  </div>
</template>

<style scoped>
.schedule-card {
  padding: 0.25rem 0 0.875rem;
  border-bottom: 1px solid hsl(var(--qp-border-subtle));
}

.schedule-card:last-of-type {
  border-bottom: 0;
}

.schedule-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.schedule-field {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}

.schedule-field--wide {
  grid-column: 1 / -1;
}

@media (max-width: 640px) {
  .schedule-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
