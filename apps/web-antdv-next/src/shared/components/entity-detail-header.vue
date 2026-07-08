<script lang="ts" setup>
import { Tag } from 'antdv-next';

defineOptions({ name: 'EntityDetailHeader' });

withDefaults(
  defineProps<{
    /** Mono, break-all identifier shown under the tag row. */
    id?: string;
    tags?: Array<{ color?: string; label: string }>;
  }>(),
  { id: undefined, tags: () => [] },
);
</script>

<template>
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div class="flex flex-col gap-1">
      <div v-if="tags.length > 0" class="flex flex-wrap items-center gap-2">
        <Tag v-for="(tag, index) in tags" :key="index" :color="tag.color">
          {{ tag.label }}
        </Tag>
      </div>
      <span v-if="id" class="text-muted-foreground font-mono text-xs break-all">
        {{ id }}
      </span>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions"></slot>
    </div>
  </div>
</template>
