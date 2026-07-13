<script setup lang="ts">
import type {
  ReportScheduleConfig,
  RuntimeConfigSchemaFieldView,
  ScheduleCadence,
} from '@vben/types';

import { computed } from 'vue';

import { Button, Card, Input, InputNumber, Switch } from 'antdv-next';

import { $t } from '#/locales';
import InputNumberWithAddon from '#/shared/components/input-number-with-addon.vue';

import { resolveUiText } from '../ui-text';
import RuntimeConfigCadenceField from './runtime-config-cadence-field.vue';
import RuntimeConfigFieldShell from './runtime-config-field-shell.vue';

const props = defineProps<{
  disabled?: boolean;
  field: RuntimeConfigSchemaFieldView;
  locale: string;
}>();

const model = defineModel<unknown[]>({ required: true });

const label = computed(() => resolveUiText(props.field.label, props.locale));

const defaultCadence = (): ScheduleCadence => ({
  interval_secs: 300,
  kind: 'interval',
});

function normalizeCadence(value: unknown): ScheduleCadence {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return defaultCadence();
  }
  const cadence = value as Partial<ScheduleCadence>;
  if (cadence.kind === 'cron' && typeof cadence.expr === 'string') {
    return {
      expr: cadence.expr,
      kind: 'cron',
      timezone: cadence.timezone ?? null,
    };
  }
  if (cadence.kind === 'interval') {
    const interval = Number(cadence.interval_secs);
    return {
      interval_secs: Number.isFinite(interval) && interval > 0 ? interval : 300,
      kind: 'interval',
    };
  }
  return defaultCadence();
}

function normalizeRow(value: unknown): ReportScheduleConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      cadence: defaultCadence(),
      enabled: true,
      schedule_id: '',
      knowledge_lag_secs: 10,
      top_n: 20,
    };
  }
  const row = value as Partial<ReportScheduleConfig>;
  const topN = Number(row.top_n);
  const delay = Number(row.knowledge_lag_secs);
  return {
    cadence: normalizeCadence(row.cadence),
    enabled: Boolean(row.enabled),
    schedule_id: String(row.schedule_id ?? ''),
    knowledge_lag_secs: Number.isFinite(delay) && delay >= 0 ? delay : 10,
    top_n: Number.isFinite(topN) && topN > 0 ? topN : 20,
  };
}

const rows = computed<ReportScheduleConfig[]>(() =>
  Array.isArray(model.value) ? model.value.map((row) => normalizeRow(row)) : [],
);

const duplicateIds = computed(() => {
  const seen = new Map<string, number>();
  for (const row of rows.value) {
    seen.set(row.schedule_id, (seen.get(row.schedule_id) ?? 0) + 1);
  }
  return new Set(
    [...seen.entries()].filter(([, count]) => count > 1).map(([id]) => id),
  );
});

function commit(next: ReportScheduleConfig[]) {
  model.value = next;
}

function patchRow(index: number, patch: Partial<ReportScheduleConfig>) {
  commit(
    rows.value.map((row, cursor) =>
      cursor === index ? { ...row, ...patch } : row,
    ),
  );
}

function addRow() {
  const next: ReportScheduleConfig = {
    cadence: { interval_secs: 300, kind: 'interval' },
    enabled: true,
    schedule_id: `schedule_${rows.value.length + 1}`,
    knowledge_lag_secs: 10,
    top_n: 20,
  };
  commit([...rows.value, next]);
}

function removeRow(index: number) {
  commit(rows.value.filter((_, cursor) => cursor !== index));
}
</script>

<template>
  <RuntimeConfigFieldShell :field="field" :label="label" :locale="locale">
    <Card
      v-for="(row, index) in rows"
      :key="row.schedule_id || index"
      size="small"
      class="border-border mb-2"
    >
      <div class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <Input
            :disabled="disabled"
            :status="duplicateIds.has(row.schedule_id) ? 'error' : undefined"
            :value="row.schedule_id"
            :placeholder="$t('page.runtimeConfig.editor.schedule.id')"
            style="max-width: 220px"
            @update:value="
              (value) => patchRow(index, { schedule_id: String(value) })
            "
          />
          <Switch
            :checked="row.enabled"
            :disabled="disabled"
            :checked-children="$t('page.runtimeConfig.editor.schedule.enabled')"
            :un-checked-children="
              $t('page.runtimeConfig.editor.schedule.disabled')
            "
            @update:checked="
              (value) => patchRow(index, { enabled: Boolean(value) })
            "
          />
          <Button
            :disabled="disabled"
            danger
            size="small"
            type="text"
            @click="removeRow(index)"
          >
            {{ $t('page.runtimeConfig.editor.schedule.remove') }}
          </Button>
        </div>

        <div class="flex flex-wrap gap-4">
          <label class="flex items-center gap-2 text-xs">
            <span class="text-muted-foreground">
              {{ $t('page.runtimeConfig.editor.schedule.topN') }}
            </span>
            <InputNumber
              :disabled="disabled"
              :min="1"
              :value="row.top_n"
              @update:value="
                (value) => patchRow(index, { top_n: Number(value ?? 1) })
              "
            />
          </label>
          <label class="flex items-center gap-2 text-xs">
            <span class="text-muted-foreground">
              {{ $t('page.runtimeConfig.editor.schedule.knowledgeLag') }}
            </span>
            <InputNumberWithAddon
              :disabled="disabled"
              :min="0"
              :model-value="row.knowledge_lag_secs"
              addon-after="s"
              @update:model-value="
                (value) =>
                  patchRow(index, { knowledge_lag_secs: Number(value ?? 0) })
              "
            />
          </label>
        </div>

        <RuntimeConfigCadenceField
          :key="`${row.schedule_id}-${row.cadence.kind}`"
          :disabled="disabled"
          :model-value="row.cadence"
          @update:model-value="(cadence) => patchRow(index, { cadence })"
        />
      </div>
    </Card>

    <Button :disabled="disabled" size="small" @click="addRow">
      {{ $t('page.runtimeConfig.editor.schedule.add') }}
    </Button>
  </RuntimeConfigFieldShell>
</template>
