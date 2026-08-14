<script lang="ts" setup>
import type { ObjectInspectorTimelineItem } from './object-inspector.types';

import { Timeline, TimelineItem } from 'antdv-next';

import EnumTag from '#/shared/components/enum-tag.vue';
import { formatDateTimeLocal } from '#/shared/components/format';

defineOptions({ name: 'ObjectInspectorTimeline' });

defineProps<{
  items: readonly ObjectInspectorTimelineItem[];
}>();
</script>

<template>
  <Timeline>
    <TimelineItem v-for="item in items" :key="item.key">
      <div class="inspector-timeline-item">
        <div class="inspector-timeline-heading">
          <span class="inspector-timeline-title">{{ item.title }}</span>
          <EnumTag
            v-if="item.status"
            :context="item.status.context ?? 'object-inspector.timeline'"
            :label="item.status.label"
            :name="item.status.name"
            :value="item.status.value"
          />
        </div>
        <span v-if="item.occurredAt" class="inspector-timeline-time">
          {{ formatDateTimeLocal(item.occurredAt) }}
        </span>
        <p v-if="item.description" class="inspector-timeline-description">
          {{ item.description }}
        </p>
      </div>
    </TimelineItem>
  </Timeline>
</template>

<style scoped>
.inspector-timeline-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 8px;
}

.inspector-timeline-heading {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  justify-content: space-between;
}

.inspector-timeline-title {
  font-size: 12px;
  font-weight: 680;
  color: hsl(var(--qp-text-primary));
}

.inspector-timeline-time,
.inspector-timeline-description {
  margin: 0;
  font-size: 11px;
  color: hsl(var(--qp-text-muted));
}
</style>
