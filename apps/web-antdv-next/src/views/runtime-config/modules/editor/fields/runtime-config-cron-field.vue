<script setup lang="ts">
import { ref, watch } from 'vue';

import { CronCore } from '@vue-js-cron/core';
import { Input, Select } from 'antdv-next';

import { $t } from '#/locales';

/**
 * 6-field cron editor built on the renderless `@vue-js-cron/core`, skinned with
 * antdv-next controls. Uses the `spring` format (`sec min hour day month
 * day-of-week`, day-of-week 0-7 with Sunday = 0/7) which is exactly the dialect
 * the backend `croner` parser accepts — so the visual builder and the
 * server-side "next runs" preview always agree. A raw expression input (committed
 * on blur) is kept as an escape hatch for advanced patterns.
 */
defineProps<{ disabled?: boolean }>();

const model = defineModel<string>({ required: true });

const raw = ref(model.value);
watch(model, (value) => {
  raw.value = value;
});
</script>

<template>
  <CronCore
    v-slot="{ fields, period, error }"
    :disabled="disabled"
    :model-value="model"
    format="spring"
    @update:model-value="(value: string) => (model = value)"
  >
    <div class="flex flex-col gap-2">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-muted-foreground text-xs">{{ period.prefix }}</span>
        <Select
          :disabled="disabled"
          :options="
            period.items.map((item: { id: string; text: string }) => ({
              label: item.text,
              value: item.id,
            }))
          "
          :value="period.attrs.modelValue"
          size="small"
          style="min-width: 120px"
          @update:value="
            (value) => period.events['update:model-value'](value as string)
          "
        />
        <template v-for="field in fields" :key="field.id">
          <span class="text-muted-foreground text-xs">{{ field.prefix }}</span>
          <Select
            :disabled="disabled"
            :options="
              field.items.map((item: { text: string; value: number }) => ({
                label: item.text,
                value: item.value,
              }))
            "
            :value="field.attrs.modelValue"
            mode="multiple"
            size="small"
            style="min-width: 130px"
            @update:value="
              (value) => field.events['update:model-value'](value as number[])
            "
          />
          <span class="text-muted-foreground text-xs">{{ field.suffix }}</span>
        </template>
      </div>

      <Input
        :disabled="disabled"
        :status="error ? 'error' : undefined"
        :value="raw"
        addon-before="cron"
        placeholder="0 0 9 * * *"
        @blur="model = raw"
        @update:value="(value: string) => (raw = value)"
      />
      <p v-if="error" class="text-destructive text-xs">{{ error }}</p>
      <p class="text-muted-foreground text-xs">
        {{ $t('page.runtimeConfig.editor.cron.format') }}
      </p>
    </div>
  </CronCore>
</template>
