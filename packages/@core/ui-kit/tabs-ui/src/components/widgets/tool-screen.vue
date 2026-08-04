<script lang="ts" setup>
import { Fullscreen, Minimize2 } from '@vben-core/icons';

defineProps<{ ariaLabel?: string }>();

const screen = defineModel<boolean>('screen');

function toggleScreen() {
  screen.value = !screen.value;
}
</script>

<template>
  <button
    :aria-label="ariaLabel"
    class="flex-center h-full cursor-pointer border-l border-border px-2 text-lg font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
    type="button"
    @click="toggleScreen"
  >
    <Minimize2 v-if="screen" class="size-4" />
    <Fullscreen v-else class="size-4" />
  </button>
</template>
