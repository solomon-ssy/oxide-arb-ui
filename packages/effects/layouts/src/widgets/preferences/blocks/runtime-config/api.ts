import type {
  RuntimeConfigActivationInfo,
  RuntimeConfigCurrentView,
  RuntimeConfigDocument,
  RuntimeConfigSchemaView,
  RuntimeConfigVersionView,
} from '@vben/types';

import type { RuntimeConfigRequestClient } from './types';

import { inject } from 'vue';

import { $t } from '@vben/locales';

import { RuntimeConfigRequestClientKey } from './types';

function governedHeaders(actingRole: string): Record<string, string> {
  return { 'X-Acting-Role': actingRole };
}

/** Self-contained runtime-config API for the package-level preferences block. */
export function useRuntimeConfigApi() {
  const injected = inject(RuntimeConfigRequestClientKey);
  if (!injected) {
    throw new Error(
      'RuntimeConfigRequestClient is not provided. Wire RuntimeConfigRequestClientKey in the app shell.',
    );
  }
  const client = injected;

  async function getCurrent() {
    return client.get<RuntimeConfigCurrentView>('/runtime-config');
  }

  async function getSchema() {
    return client.get<RuntimeConfigSchemaView>('/runtime-config/schema');
  }

  async function createVersion(
    configJson: RuntimeConfigDocument,
    ctx: { actingRole: string; reason: string },
  ) {
    return client.post<RuntimeConfigVersionView>(
      '/runtime-config/versions',
      { config_json: configJson, reason: ctx.reason },
      { headers: governedHeaders(ctx.actingRole) },
    );
  }

  async function createVersionPatch(
    configPatch: Record<string, unknown>,
    ctx: { actingRole: string; reason: string },
  ) {
    return client.post<RuntimeConfigVersionView>(
      '/runtime-config/versions',
      { config_patch: configPatch, reason: ctx.reason },
      { headers: governedHeaders(ctx.actingRole) },
    );
  }

  async function activateVersion(
    versionId: string,
    ctx: { actingRole: string; reason: string },
  ) {
    return client.post<RuntimeConfigActivationInfo>(
      `/runtime-config/versions/${versionId}/activate`,
      { reason: ctx.reason },
      { headers: governedHeaders(ctx.actingRole) },
    );
  }

  return {
    activateVersion,
    createVersion,
    createVersionPatch,
    getCurrent,
    getSchema,
    missingGovernanceBridgeMessage: () =>
      $t('preferences.runtimeConfig.error.missingGovernanceBridge'),
  };
}

/** Type guard for app-shell injection wiring. */
export function isRuntimeConfigRequestClient(
  value: unknown,
): value is RuntimeConfigRequestClient {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as RuntimeConfigRequestClient).get === 'function' &&
    typeof (value as RuntimeConfigRequestClient).post === 'function'
  );
}
