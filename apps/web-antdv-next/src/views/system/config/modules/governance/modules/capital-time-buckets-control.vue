<script lang="ts" setup>
import type { CapitalTimeBucketLimit } from '@vben/types/config-api';

import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Input, InputNumber } from 'antdv-next';

import { $t } from '#/locales';

defineOptions({ name: 'CapitalTimeBucketsControl' });

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    modelValue: unknown;
  }>(),
  { disabled: false },
);

const emit = defineEmits<{
  'update:modelValue': [value: CapitalTimeBucketLimit[]];
}>();

const buckets = computed<CapitalTimeBucketLimit[]>(() =>
  Array.isArray(props.modelValue)
    ? (props.modelValue as CapitalTimeBucketLimit[])
    : [],
);

function updateBucket(index: number, patch: Partial<CapitalTimeBucketLimit>) {
  const next = structuredClone(buckets.value);
  const current = next[index];
  if (!current) return;
  next[index] = { ...current, ...patch };
  emit('update:modelValue', next);
}

function addBucket() {
  const previous = buckets.value.at(-1);
  emit('update:modelValue', [
    ...structuredClone(buckets.value),
    {
      end_secs: previous
        ? Math.max(previous.end_secs + 3600, previous.end_secs * 2)
        : 3600,
      max_capital_usd: previous?.max_capital_usd ?? '0',
    },
  ]);
}

function removeBucket(index: number) {
  emit(
    'update:modelValue',
    buckets.value.filter((_, bucketIndex) => bucketIndex !== index),
  );
}
</script>

<template>
  <div class="space-y-2">
    <article
      v-for="(bucket, index) in buckets"
      :key="`${index}:${bucket.end_secs}`"
      class="bucket-row"
    >
      <span class="bucket-index" aria-hidden="true">{{ index + 1 }}</span>
      <label class="bucket-field">
        <span>{{ $t('page.config.editor.bucketEnd') }}</span>
        <InputNumber
          :aria-label="$t('page.config.editor.bucketEnd')"
          :disabled="disabled"
          :min="1"
          :precision="0"
          :value="bucket.end_secs"
          class="w-full"
          @update:value="
            typeof $event === 'number' &&
            updateBucket(index, { end_secs: $event })
          "
        />
      </label>
      <label class="bucket-field">
        <span>{{ $t('page.config.editor.bucketCapital') }}</span>
        <Input
          :aria-label="$t('page.config.editor.bucketCapital')"
          :disabled="disabled"
          inputmode="decimal"
          :value="bucket.max_capital_usd"
          @update:value="updateBucket(index, { max_capital_usd: $event })"
        />
      </label>
      <Button
        :aria-label="$t('page.config.editor.removeItem')"
        :disabled="disabled"
        danger
        shape="circle"
        type="text"
        @click="removeBucket(index)"
      >
        <IconifyIcon icon="lucide:trash-2" />
      </Button>
    </article>

    <Button :disabled="disabled" type="dashed" block @click="addBucket">
      <IconifyIcon icon="lucide:plus" />
      {{ $t('page.config.editor.addItem') }}
    </Button>
  </div>
</template>

<style scoped>
.bucket-row {
  display: grid;
  grid-template-columns: 1.75rem minmax(8rem, 1fr) minmax(8rem, 1fr) auto;
  gap: 0.75rem;
  align-items: end;
  padding: 0.5rem 0;
  border-bottom: 1px solid hsl(var(--qp-border-subtle));
}

.bucket-row:last-of-type {
  border-bottom: 0;
}

.bucket-index {
  display: grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  margin-bottom: 0.3rem;
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted));
  border-radius: 999px;
}

.bucket-field {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}

@media (max-width: 640px) {
  .bucket-row {
    grid-template-columns: 1.75rem minmax(0, 1fr) auto;
  }

  .bucket-field {
    grid-column: 2;
  }
}
</style>
