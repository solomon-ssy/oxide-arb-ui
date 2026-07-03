<script setup lang="ts">
defineOptions({ name: 'RuntimeConfigEditorSkeleton' });
</script>

<template>
  <div
    class="runtime-config-editor-skeleton space-y-4"
    aria-busy="true"
    aria-live="polite"
  >
    <div class="bg-muted/60 h-9 w-full animate-pulse rounded-lg"></div>

    <div class="space-y-2">
      <div
        v-for="index in 4"
        :key="index"
        class="border-border/60 overflow-hidden rounded-lg border"
      >
        <div class="bg-muted/40 flex h-11 items-center gap-3 px-4">
          <div class="bg-muted size-4 animate-pulse rounded"></div>
          <div
            class="bg-muted h-4 animate-pulse rounded"
            :class="index === 1 ? 'w-36' : 'w-28'"
          ></div>
        </div>
        <div v-if="index === 1" class="space-y-3 p-4">
          <div class="bg-muted/50 h-3 w-3/4 animate-pulse rounded"></div>
          <div class="grid gap-3 md:grid-cols-2">
            <div class="bg-muted/40 h-10 animate-pulse rounded-md"></div>
            <div class="bg-muted/40 h-10 animate-pulse rounded-md"></div>
          </div>
          <div class="bg-muted/40 h-24 animate-pulse rounded-md"></div>
        </div>
      </div>
    </div>
  </div>
</template>
