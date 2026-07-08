<script lang="ts" setup>
import type { DecimalSign } from '#/shared/components/format';

import { computed } from 'vue';

defineOptions({ name: 'SignedValue' });

const props = withDefaults(
  defineProps<{
    /** Render in monospace tabular figures — the default for numeric cells. */
    mono?: boolean;
    /** Drives coloring: `1` → success token, `-1` → destructive token, `0`/`null` → neutral. */
    sign?: DecimalSign | null;
    /** Pre-formatted display value (formatting stays in the caller). */
    value: string;
  }>(),
  { mono: true, sign: null },
);

const toneClass = computed(() => {
  if (props.sign === 1) {
    return 'text-success';
  }
  if (props.sign === -1) {
    return 'text-destructive';
  }
  return '';
});
</script>

<template>
  <span :class="[toneClass, mono ? 'font-mono tabular-nums' : '']">
    {{ value }}
  </span>
</template>
