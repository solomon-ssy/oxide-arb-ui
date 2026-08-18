<script lang="ts" setup>
import type { EnumPresentation } from '#/shared/presentation/enum-presentation';

import { IconifyIcon } from '@vben/icons';

defineOptions({ name: 'StatusChip' });

withDefaults(
  defineProps<{
    categoryHue?: number;
    emphasis?: EnumPresentation['emphasis'];
    icon?: string;
    size?: 'compact' | 'control';
    tone?: EnumPresentation['tone'];
  }>(),
  {
    categoryHue: undefined,
    emphasis: 'subtle',
    icon: undefined,
    size: 'compact',
    tone: 'neutral',
  },
);
</script>

<template>
  <span
    class="qp-status-chip qp-tone"
    :data-category-hue="categoryHue"
    :data-emphasis="emphasis ?? 'subtle'"
    :data-size="size"
    :data-tone="tone"
  >
    <IconifyIcon v-if="icon" :icon="icon" />
    <span class="qp-status-chip__label"><slot></slot></span>
  </span>
</template>

<style scoped>
.qp-status-chip {
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
  width: fit-content;
  max-width: 100%;
  padding-block: 0.125rem;
  padding-inline: 0.5rem;
  font-size: 0.75rem;
  font-weight: 560;
  line-height: 1.25;
  color: hsl(var(--qp-tone-color));
  background: hsl(var(--qp-tone-color) / 10%);
  border: 1px solid hsl(var(--qp-tone-color) / 46%);
  border-radius: var(--qp-radius-sm);
}

.qp-status-chip :deep(svg) {
  flex: none;
  width: 0.75rem;
  height: 0.75rem;
}

.qp-status-chip__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

[data-emphasis='solid'] {
  background: hsl(var(--qp-tone-color) / 14%);
  border-color: hsl(var(--qp-tone-color) / 58%);
}

[data-size='control'] {
  justify-content: center;
  min-height: 2.75rem;
  padding-inline: 0.75rem;
}
</style>
