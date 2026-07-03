<script setup lang="ts">
import type { SchemaSection } from '@vben/types';

import { IconifyIcon } from '@vben/icons';

import { DEFAULT_SECTION_ICON, resolveSectionIcon } from '../section-icons';

const props = withDefaults(
  defineProps<{
    section: Pick<SchemaSection, 'icon' | 'id'>;
    sizeClass?: string;
    /** Top-level sections get a tinted chip; nested use plain icon. */
    variant?: 'nested' | 'top';
  }>(),
  {
    sizeClass: 'size-3.5',
    variant: 'nested',
  },
);

const icon = resolveSectionIcon(props.section);
</script>

<template>
  <span
    class="runtime-config-section-icon"
    :class="{ 'runtime-config-section-icon--top': variant === 'top' }"
    :title="icon === DEFAULT_SECTION_ICON ? section.id : undefined"
  >
    <IconifyIcon :class="sizeClass" :icon="icon" />
  </span>
</template>

<style scoped>
.runtime-config-section-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  color: hsl(var(--primary) / 85%);
}

.runtime-config-section-icon--top {
  width: 1.375rem;
  height: 1.375rem;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-radius: 0.3rem;
}
</style>
