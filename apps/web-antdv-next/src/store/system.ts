import type { SyncSnapshot, SystemStatus, UuidString } from '@vben/types';

import { ref } from 'vue';

import { defineStore } from 'pinia';

/**
 * Live system status (quant runtime mode / kill-switch / operational phase),
 * seeded by REST first paint and kept hot by WS `system.status` pushes +
 * `sync` snapshots. Page tables never live here — status coordination only.
 */
export const useSystemStore = defineStore('qp-system', () => {
  const status = ref<null | SystemStatus>(null);
  /** Last runtime-config version activated this session (WS `config.activated`). */
  const activeConfigVersion = ref<null | UuidString>(null);

  function applySystemStatus(next: SystemStatus) {
    status.value = next;
  }

  function setActiveConfigVersion(versionId: UuidString) {
    activeConfigVersion.value = versionId;
  }

  function applySyncSnapshot(snapshot: SyncSnapshot) {
    if (snapshot.system_status) {
      status.value = snapshot.system_status;
    }
  }

  function $reset() {
    status.value = null;
    activeConfigVersion.value = null;
  }

  return {
    $reset,
    activeConfigVersion,
    applySyncSnapshot,
    applySystemStatus,
    setActiveConfigVersion,
    status,
  };
});
