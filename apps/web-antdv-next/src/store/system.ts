import type { SyncSnapshot, SystemStatus, UuidString } from '@vben/types';

import { ref } from 'vue';

import { defineStore } from 'pinia';

/**
 * Live system status (execution mode / breaker / exposure), fed by REST first
 * paint and kept hot by WS `system.status` pushes + `sync` snapshots.
 */
export const useSystemStore = defineStore('oxide-system', () => {
  const status = ref<null | SystemStatus>(null);
  /** Last runtime-config version activated during this session (WS `config.activated`). */
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
