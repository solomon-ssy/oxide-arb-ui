<script setup lang="ts">
import { $t } from '@vben/locales';

import { VbenButton } from '@vben-core/shadcn-ui';

defineProps<{
  description?: string;
  dirty?: boolean;
  disableApply?: boolean;
  error?: string;
  loading?: boolean;
  moneyCritical?: boolean;
  requireDiffAck?: boolean;
  title: string;
}>();

const emit = defineEmits<{
  apply: [];
  reload: [];
  reset: [];
}>();
</script>

<template>
  <section class="bg-background rounded-lg border p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="text-foreground text-base font-semibold">
            {{ title }}
          </h3>
          <span
            v-if="dirty"
            class="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary"
          >
            {{ $t('preferences.runtimeConfig.state.dirty') }}
          </span>
          <span
            v-if="moneyCritical"
            class="rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600"
          >
            {{ $t('preferences.runtimeConfig.state.moneyCritical') }}
          </span>
        </div>
        <p v-if="description" class="text-muted-foreground mt-1 text-sm">
          {{ description }}
        </p>
      </div>
      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <VbenButton
          :disabled="loading"
          size="sm"
          variant="outline"
          @click="emit('reload')"
        >
          {{ $t('common.refresh') }}
        </VbenButton>
        <VbenButton
          :disabled="loading || !dirty"
          size="sm"
          variant="ghost"
          @click="emit('reset')"
        >
          {{ $t('common.reset') }}
        </VbenButton>
        <VbenButton
          :disabled="loading || disableApply || !dirty"
          size="sm"
          @click="emit('apply')"
        >
          {{ $t('common.apply') }}
        </VbenButton>
      </div>
    </div>
    <div
      v-if="error"
      class="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600"
    >
      {{ error }}
    </div>
    <div class="mt-4 space-y-4">
      <slot></slot>
    </div>
  </section>
</template>
