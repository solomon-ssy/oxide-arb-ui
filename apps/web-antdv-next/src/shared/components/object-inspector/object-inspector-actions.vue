<script lang="ts" setup>
import type { ObjectInspectorAction } from './object-inspector.types';

import { IconifyIcon } from '@vben/icons';

import { Button } from 'antdv-next';

defineOptions({ name: 'ObjectInspectorActions' });

defineProps<{
  actions: readonly ObjectInspectorAction[];
}>();

const emit = defineEmits<{
  select: [action: ObjectInspectorAction];
}>();
</script>

<template>
  <div class="object-inspector-actions">
    <Button
      v-for="action in actions"
      :key="action.key"
      :danger="action.danger"
      :disabled="action.disabled"
      :loading="action.loading"
      :type="action.primary ? 'primary' : 'default'"
      @click="emit('select', action)"
    >
      <IconifyIcon v-if="action.icon" class="mr-1 size-4" :icon="action.icon" />
      {{ action.label }}
    </Button>
  </div>
</template>

<style scoped>
.object-inspector-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid hsl(var(--qp-border-subtle));
}
</style>
