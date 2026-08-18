<script lang="ts" setup>
import type { EnumTone } from '#/shared/presentation/enum-presentation';

import { computed, onScopeDispose, ref } from 'vue';

import { Tooltip } from 'antdv-next';

import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import HeaderStatusGlyph from '#/shared/components/header/header-status-glyph.vue';
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

const ICON_NAME = {
  connected: 'lucide:wifi',
  connecting: 'lucide:loader-2',
  disconnected: 'lucide:wifi-off',
  reconnecting: 'lucide:loader-2',
} as const;

const ICON_TONE: Record<keyof typeof ICON_NAME, EnumTone> = {
  connected: 'success',
  connecting: 'running',
  disconnected: 'danger',
  reconnecting: 'warning',
};

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
      class="qp-header-status-btn"
      :data-state="wsStore.status"
      data-testid="websocket-status"
      type="button"
      @click="connect"
    >
      <HeaderStatusGlyph
        :icon="ICON_NAME[wsStore.status]"
        :spin="
          wsStore.status === 'connecting' || wsStore.status === 'reconnecting'
        "
        :tone="ICON_TONE[wsStore.status]"
      />
      <span
        v-if="isStatusStale"
        class="bg-warning absolute right-1 top-1 size-1.5 rounded-full"
      ></span>
    </button>
  </Tooltip>
</template>
