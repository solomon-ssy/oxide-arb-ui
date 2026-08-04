<script lang="ts" setup>
import { RotateCw } from '@vben-core/icons';

defineProps<{ ariaLabel?: string }>();

const emit = defineEmits(['refresh']);

const handleRefresh = () => {
  emit('refresh');
};
</script>

<template>
  <button
    :aria-label="ariaLabel"
    class="flex-center h-full cursor-pointer border-l border-border px-2 text-lg font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
    type="button"
    @click="handleRefresh"
  >
    <RotateCw class="size-4" />
  </button>
</template>
