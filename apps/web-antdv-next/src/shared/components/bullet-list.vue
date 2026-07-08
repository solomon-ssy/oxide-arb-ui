<script lang="ts" setup>
import { IconifyIcon } from '@vben/icons';

defineOptions({ name: 'BulletList' });

withDefaults(
  defineProps<{
    items: readonly string[];
    /**
     * `destructive` renders a leading alert icon per row instead of a plain
     * disc marker — for reason/violation lists surfaced next to a warning or
     * error state. `default` stays a plain semantic list.
     */
    tone?: 'default' | 'destructive';
  }>(),
  { tone: 'default' },
);
</script>

<template>
  <ul
    v-if="tone === 'destructive'"
    class="flex list-none flex-col gap-1 pl-0 text-sm"
  >
    <li
      v-for="(item, index) in items"
      :key="index"
      class="text-destructive flex items-start gap-1.5"
    >
      <IconifyIcon
        class="mt-0.5 size-3.5 shrink-0"
        icon="lucide:circle-alert"
      />
      <span>{{ item }}</span>
    </li>
  </ul>
  <ul v-else class="list-disc space-y-1 pl-4 text-sm">
    <li v-for="(item, index) in items" :key="index">{{ item }}</li>
  </ul>
</template>
