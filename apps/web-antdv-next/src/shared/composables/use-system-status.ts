import type { SystemControlPlaneStatus } from '@vben/types';

import { onMounted, watch } from 'vue';

import { useRequestHandler } from '@vben/request/qp';

import { getActionEligibility, getSystemStatus } from '#/api/system';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useSystemStore } from '#/store/system';

type HandleRequest = ReturnType<typeof useRequestHandler>['handleRequest'];

/**
 * Fetch system status when the caller has `system:read` (shared REST bootstrap).
 */
export async function fetchSystemStatusIfAllowed(
  canRead: boolean,
  handleRequest: HandleRequest,
  apply: (status: SystemControlPlaneStatus) => void,
): Promise<void> {
  if (!canRead) {
    return;
  }
  await handleRequest(getSystemStatus, apply);
}

/**
 * Bootstrap `GET /system/status` on mount so the header converges before the
 * first WS push (always-fanout + connect snapshot are still the hot path).
 */
export function useSystemStatusBootstrap() {
  const systemStore = useSystemStore();
  const { handleRequest } = useRequestHandler();
  const { hasAccessByCodes } = useQpAccess();
  let eligibilityRequestInFlight = false;

  async function refreshActionEligibility() {
    if (eligibilityRequestInFlight) {
      return;
    }
    eligibilityRequestInFlight = true;
    try {
      await handleRequest(getActionEligibility, (eligibility) => {
        systemStore.applyActionEligibility(eligibility);
      });
    } finally {
      eligibilityRequestInFlight = false;
    }
  }

  onMounted(async () => {
    await fetchSystemStatusIfAllowed(
      hasAccessByCodes(['system:read']),
      handleRequest,
      (status) => systemStore.applyControlPlaneStatus(status),
    );
    await refreshActionEligibility();
  });

  watch(
    () => systemStore.controlPlane?.capabilities.revision,
    (revision) => {
      if (
        revision !== undefined &&
        systemStore.actionEligibility?.capability_revision !== revision
      ) {
        void refreshActionEligibility();
      }
    },
  );
}
