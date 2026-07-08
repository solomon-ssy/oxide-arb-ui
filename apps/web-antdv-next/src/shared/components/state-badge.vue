<script lang="ts" setup>
import { Badge, Tooltip } from 'antdv-next';

defineOptions({ name: 'StateBadge' });

withDefaults(
  defineProps<{
    /** Accessible name — always announced, and shown visibly when `showText`. */
    label: string;
    /** Render the label as visible text next to the dot (default: dot-only + tooltip). */
    showText?: boolean;
    status?: 'default' | 'error' | 'processing' | 'success' | 'warning';
  }>(),
  { showText: false, status: 'default' },
);
</script>

<template>
  <span v-if="showText" class="inline-flex items-center gap-1.5">
    <Badge :status="status" />
    <span class="text-sm">{{ label }}</span>
  </span>
  <Tooltip v-else :title="label">
    <span class="inline-flex items-center">
      <Badge :status="status" />
      <span class="sr-only">{{ label }}</span>
    </span>
  </Tooltip>
</template>
