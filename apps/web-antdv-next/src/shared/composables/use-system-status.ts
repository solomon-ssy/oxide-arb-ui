import type { SystemStatus } from '@vben/types';

import { onMounted } from 'vue';

import { useRequestHandler } from '@vben/request/qp';

import { getSystemStatus } from '#/api/system';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useSystemStore } from '#/store/system';

type HandleRequest = ReturnType<typeof useRequestHandler>['handleRequest'];

/**
 * Fetch system status when the caller has `system:read` (shared REST bootstrap).
 */
export async function fetchSystemStatusIfAllowed(
  canRead: boolean,
  handleRequest: HandleRequest,
  apply: (status: SystemStatus) => void,
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

  onMounted(() => {
    void fetchSystemStatusIfAllowed(
      hasAccessByCodes(['system:read']),
      handleRequest,
      (status) => {
        systemStore.applySystemStatus(status);
      },
    );
  });
}
