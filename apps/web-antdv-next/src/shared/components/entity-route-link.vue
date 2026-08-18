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
    class="qp-entity-link rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    :class="mono ? 'font-mono text-xs break-all' : ''"
    :to="to"
    @click.stop
  >
    {{ label }}
  </RouterLink>
</template>
