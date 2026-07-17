import type {
  ActionEligibilityView,
  SyncSnapshot,
  SystemControlPlaneStatus,
  SystemStatus,
  UuidString,
} from '@vben/types';

import { ref } from 'vue';

import { defineStore } from 'pinia';

/**
 * Live system status (quant runtime mode / kill-switch / operational phase),
 * seeded by REST first paint and kept hot by WS `system.status` pushes +
 * `sync` snapshots. Page tables never live here — status coordination only.
 */
export const useSystemStore = defineStore('qp-system', () => {
  const status = ref<null | SystemStatus>(null);
  const controlPlane = ref<null | SystemControlPlaneStatus>(null);
  const actionEligibility = ref<ActionEligibilityView | null>(null);
  /** Last runtime-config version activated this session (WS `config.activated`). */
  const activeConfigVersion = ref<null | UuidString>(null);

  function applySystemStatus(next: SystemStatus) {
    status.value = next;
  }

  function applyControlPlaneStatus(next: SystemControlPlaneStatus) {
    controlPlane.value = next;
    status.value = next;
    if (
      actionEligibility.value?.capability_revision !==
      next.capabilities.revision
    ) {
      actionEligibility.value = null;
    }
  }

  function applyActionEligibility(next: ActionEligibilityView) {
    const currentRevision = controlPlane.value?.capabilities.revision;
    if (
      currentRevision === undefined ||
      currentRevision === next.capability_revision
    ) {
      actionEligibility.value = next;
    }
  }

  function clearActionEligibility() {
    actionEligibility.value = null;
  }

  function setActiveConfigVersion(versionId: UuidString) {
    activeConfigVersion.value = versionId;
  }

  function applySyncSnapshot(snapshot: SyncSnapshot) {
    if (snapshot.system_status) {
      applyControlPlaneStatus(snapshot.system_status);
    }
  }

  function $reset() {
    status.value = null;
    controlPlane.value = null;
    actionEligibility.value = null;
    activeConfigVersion.value = null;
  }

  return {
    $reset,
    activeConfigVersion,
    actionEligibility,
    applyActionEligibility,
    applyControlPlaneStatus,
    applySyncSnapshot,
    applySystemStatus,
    clearActionEligibility,
    controlPlane,
    setActiveConfigVersion,
    status,
  };
});
