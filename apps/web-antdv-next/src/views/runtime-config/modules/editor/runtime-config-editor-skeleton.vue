<script setup lang="ts">
import { Skeleton } from 'antdv-next';

defineOptions({ name: 'RuntimeConfigEditorSkeleton' });
</script>

<template>
  <div
    class="runtime-config-editor-skeleton space-y-4"
    aria-busy="true"
    aria-live="polite"
  >
    <div class="h-9">
      <Skeleton active :paragraph="false" :title="{ width: '100%' }" />
    </div>

    <div class="space-y-2">
      <div
        v-for="index in 4"
        :key="index"
        class="border-border/60 overflow-hidden rounded-lg border"
      >
        <div class="px-4 py-3">
          <Skeleton
            active
            :paragraph="false"
            :title="{ width: index === 1 ? '36%' : '28%' }"
          />
        </div>
        <div v-if="index === 1" class="space-y-3 p-4">
          <Skeleton
            active
            :paragraph="{ rows: 1, width: '75%' }"
            :title="false"
          />
          <div class="grid gap-3 md:grid-cols-2">
            <Skeleton active :paragraph="{ rows: 1 }" :title="false" />
            <Skeleton active :paragraph="{ rows: 1 }" :title="false" />
          </div>
          <Skeleton active :paragraph="{ rows: 3 }" :title="false" />
        </div>
      </div>
    </div>
  </div>
</template>
