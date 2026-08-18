<script lang="ts" setup>
import type { EnumPresentation } from '#/shared/presentation/enum-presentation';

import { IconifyIcon } from '@vben/icons';

defineOptions({ name: 'HeaderStatusGlyph' });

withDefaults(
  defineProps<{
    categoryHue?: number;
    icon: string;
    spin?: boolean;
    tone?: EnumPresentation['tone'];
  }>(),
  {
    categoryHue: undefined,
    spin: false,
    tone: 'neutral',
  },
);
</script>

<template>
  <IconifyIcon
    class="qp-header-glyph qp-tone"
    :class="{ 'animate-spin': spin }"
    :data-category-hue="categoryHue"
    :data-tone="tone"
    :icon="icon"
  />
</template>

<style scoped>
.qp-header-glyph {
  width: 1.125rem;
  height: 1.125rem;
  color: hsl(var(--qp-tone-color));
}
</style>
