import type { ControlPublishedEvent, IsoDateTime } from '@vben/types';

import { ref } from 'vue';

import { defineStore } from 'pinia';

/** Lightweight control-plane invalidation signals fed by governance WS events. */
export const useControlStore = defineStore('oxide-control', () => {
  const lastPublished = ref<ControlPublishedEvent | null>(null);
  const lastPublishedAt = ref<IsoDateTime | null>(null);
  const revision = ref(0);

  function recordPublished(
    event: ControlPublishedEvent,
    timestamp?: IsoDateTime,
  ) {
    lastPublished.value = event;
    lastPublishedAt.value = timestamp ?? null;
    revision.value += 1;
  }

  function $reset() {
    lastPublished.value = null;
    lastPublishedAt.value = null;
    revision.value = 0;
  }

  return {
    $reset,
    lastPublished,
    lastPublishedAt,
    recordPublished,
    revision,
  };
});
