<script lang="ts" setup>
import type { ObjectInspectorStatus } from './object-inspector.types';

import { Tooltip } from 'antdv-next';

import EnumTag from '#/shared/components/enum-tag.vue';

defineOptions({ name: 'ObjectInspectorHeader' });

withDefaults(
  defineProps<{
    entityId?: string;
    eyebrow?: string;
    statuses?: readonly ObjectInspectorStatus[];
    title?: string;
  }>(),
  {
    entityId: undefined,
    eyebrow: undefined,
    statuses: () => [],
    title: undefined,
  },
);
</script>

<template>
  <header class="object-inspector-header">
    <div class="object-inspector-identity">
      <span v-if="eyebrow" class="object-inspector-eyebrow">{{ eyebrow }}</span>
      <h2 v-if="title" class="object-inspector-title">{{ title }}</h2>
      <div v-if="statuses.length > 0" class="object-inspector-statuses">
        <EnumTag
          v-for="status in statuses"
          :key="`${status.name}:${status.value}`"
          :context="status.context"
          :label="status.label"
          :name="status.name"
          :value="status.value"
        />
      </div>
      <Tooltip v-if="entityId" :title="entityId">
        <span class="object-inspector-id">{{ entityId }}</span>
      </Tooltip>
    </div>
    <div v-if="$slots.actions" class="object-inspector-primary-actions">
      <slot name="actions"></slot>
    </div>
  </header>
</template>

<style scoped>
.object-inspector-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.object-inspector-identity {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.object-inspector-eyebrow {
  font-size: 10px;
  font-weight: 720;
  color: hsl(var(--qp-text-muted));
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.object-inspector-title {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 17px;
  font-weight: 720;
  color: hsl(var(--qp-text-primary));
  white-space: nowrap;
}

.object-inspector-statuses,
.object-inspector-primary-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.object-inspector-id {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 11px;
  color: hsl(var(--qp-text-muted));
  white-space: nowrap;
}
</style>
