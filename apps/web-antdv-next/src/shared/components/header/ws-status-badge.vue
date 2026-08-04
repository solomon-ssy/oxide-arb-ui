<script lang="ts" setup>
import { computed, onScopeDispose, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Tooltip } from 'antdv-next';

import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import { useQpWs } from '#/shared/composables/use-qp-ws';
import { useWsStore } from '#/store';

defineOptions({ name: 'WsStatusBadge' });

const STALE_MS = 10_000;

const wsStore = useWsStore();
const { connect } = useQpWs();
const nowMs = ref(Date.now());
const timer = setInterval(() => {
  nowMs.value = Date.now();
}, 1000);
onScopeDispose(() => clearInterval(timer));

const ICON_CLASS = {
  connected: 'text-success',
  connecting: 'text-primary animate-spin',
  disconnected: 'text-destructive',
  reconnecting: 'text-warning animate-spin',
} as const;

const ICON_NAME = {
  connected: 'lucide:wifi',
  connecting: 'lucide:loader-2',
  disconnected: 'lucide:wifi-off',
  reconnecting: 'lucide:loader-2',
} as const;

const isStatusStale = computed(() => {
  if (wsStore.status !== 'connected' || !wsStore.lastSystemStatusAt) {
    return false;
  }
  const lastMs = Date.parse(wsStore.lastSystemStatusAt);
  if (Number.isNaN(lastMs)) {
    return false;
  }
  return nowMs.value - lastMs > STALE_MS;
});

const statusLabel = computed(() => $t(`page.ws.status.${wsStore.status}`));

const tooltip = computed(() => {
  const syncedAt = wsStore.lastSyncAt
    ? $t('page.ws.lastSync', { at: formatDateTimeLocal(wsStore.lastSyncAt) })
    : $t('page.ws.neverSynced');
  const staleHint = isStatusStale.value
    ? ` · ${$t('page.ws.statusStale')}`
    : '';
  return `${statusLabel.value} · ${syncedAt}${staleHint}`;
});
</script>

<template>
  <Tooltip :title="tooltip">
    <button
      :aria-label="statusLabel"
      class="hover:bg-accent relative flex size-11 cursor-pointer items-center justify-center rounded-md"
      :data-state="wsStore.status"
      data-testid="websocket-status"
      type="button"
      @click="connect"
    >
      <IconifyIcon
        :class="ICON_CLASS[wsStore.status]"
        :icon="ICON_NAME[wsStore.status]"
        class="size-4"
      />
      <span
        v-if="isStatusStale"
        class="bg-warning absolute right-1 top-1 size-1.5 rounded-full"
      ></span>
    </button>
  </Tooltip>
</template>
