<script lang="ts" setup>
import { RouterLink } from 'vue-router';

defineOptions({ name: 'EntityRouteLink' });

defineProps<{
  /** Display text (id / question / short label). */
  label: string;
  /** Render the label in a monospace, break-all style (ids / hashes). */
  mono?: boolean;
  /** Target route path. */
  to: string;
}>();
</script>

<template>
  <RouterLink
    class="text-primary hover:underline"
    :class="mono ? 'font-mono text-xs break-all' : ''"
    :to="to"
  >
    {{ label }}
  </RouterLink>
</template>
