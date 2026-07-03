<script setup lang="ts">
import type { ScheduleCadence } from '@vben/types';

import { computed, ref, watch } from 'vue';

import { useDebounceFn } from '@vueuse/core';
import { Segmented, Select, Spin } from 'antdv-next';

import { previewSchedule } from '#/api/runtime-config';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import InputNumberWithAddon from '#/shared/components/input-number-with-addon.vue';

import RuntimeConfigCronField from './runtime-config-cron-field.vue';

defineProps<{ disabled?: boolean }>();

const model = defineModel<ScheduleCadence>({ required: true });

/** Common IANA zones; empty (cleared) means UTC. */
const timezoneOptions = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
].map((zone) => ({ label: zone, value: zone }));

const kind = computed<'cron' | 'interval'>(() => model.value.kind);

const modeOptions = computed(() => [
  {
    label: $t('page.runtimeConfig.editor.cadence.interval'),
    value: 'interval',
  },
  { label: $t('page.runtimeConfig.editor.cadence.cron'), value: 'cron' },
]);

function setKind(next: number | string) {
  if (next === model.value.kind) {
    return;
  }
  model.value =
    next === 'cron'
      ? { expr: '0 0 9 * * *', kind: 'cron', timezone: null }
      : { interval_secs: 300, kind: 'interval' };
}

const intervalSecs = computed({
  get: () =>
    model.value.kind === 'interval' ? model.value.interval_secs : 300,
  set: (value: null | number) => {
    model.value = { interval_secs: Math.max(1, value ?? 1), kind: 'interval' };
  },
});

const cronExpr = computed({
  get: () => (model.value.kind === 'cron' ? model.value.expr : ''),
  set: (expr: string) => {
    if (model.value.kind === 'cron') {
      model.value = { ...model.value, expr };
    }
  },
});

const timezone = computed({
  get: () =>
    model.value.kind === 'cron'
      ? (model.value.timezone ?? undefined)
      : undefined,
  set: (value: string | undefined) => {
    if (model.value.kind === 'cron') {
      model.value = { ...model.value, timezone: value ?? null };
    }
  },
});

const previewTimes = ref<string[]>([]);
const previewError = ref('');
const previewLoading = ref(false);
/** Monotonic token so stale debounced responses cannot overwrite fresh preview. */
let previewSeq = 0;

const formattedPreviewTimes = computed(() =>
  previewTimes.value.map((time) => formatDateTimeLocal(time)),
);

const runPreview = useDebounceFn(async () => {
  const seq = ++previewSeq;
  previewLoading.value = true;
  previewError.value = '';
  try {
    const result = await previewSchedule({ cadence: model.value, count: 5 });
    if (seq !== previewSeq) {
      return;
    }
    previewTimes.value = result.next_fire_times;
  } catch (error_) {
    if (seq !== previewSeq) {
      return;
    }
    previewTimes.value = [];
    previewError.value =
      error_ instanceof Error ? error_.message : String(error_);
  } finally {
    if (seq === previewSeq) {
      previewLoading.value = false;
    }
  }
}, 400);

watch(model, () => void runPreview(), { deep: true, immediate: true });
</script>

<template>
  <div class="border-border/60 flex flex-col gap-2 rounded-md border p-2">
    <Segmented
      :disabled="disabled"
      :options="modeOptions"
      :value="kind"
      @change="setKind"
    />

    <InputNumberWithAddon
      v-if="kind === 'interval'"
      v-model="intervalSecs"
      :disabled="disabled"
      :min="1"
      addon-after="s"
    />

    <template v-else>
      <RuntimeConfigCronField v-model="cronExpr" :disabled="disabled" />
      <Select
        v-model:value="timezone"
        :disabled="disabled"
        :options="timezoneOptions"
        :placeholder="$t('page.runtimeConfig.editor.cadence.timezoneUtc')"
        allow-clear
        show-search
        class="w-full"
      />
    </template>

    <div class="text-xs">
      <div class="text-muted-foreground mb-1">
        {{ $t('page.runtimeConfig.editor.cadence.nextRuns') }}
      </div>
      <Spin v-if="previewLoading" size="small" />
      <p v-else-if="previewError" class="text-destructive">
        {{ previewError }}
      </p>
      <ul v-else-if="formattedPreviewTimes.length > 0">
        <li v-for="(time, index) in formattedPreviewTimes" :key="index">
          {{ time }}
        </li>
      </ul>
      <p v-else class="text-muted-foreground">
        {{ $t('page.runtimeConfig.editor.cadence.noPreview') }}
      </p>
    </div>
  </div>
</template>
