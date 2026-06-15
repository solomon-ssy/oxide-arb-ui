import type {
  RuntimeConfigActivationInfo,
  RuntimeConfigCurrentView,
  RuntimeConfigDocument,
  RuntimeConfigPatch,
  RuntimeConfigSchemaView,
  RuntimeConfigVersionView,
  UuidString,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { governedPost } from '#/api/governed-request';
import { requestClient } from '#/api/request';

export namespace RuntimeConfigApi {
  export const base = '/runtime-config';
  export const schema = `${base}/schema`;
  export const versions = `${base}/versions`;
  export const activateVersion = (id: UuidString) =>
    `${versions}/${id}/activate`;
  export const rollbackVersion = (id: UuidString) =>
    `${versions}/${id}/rollback`;

  export interface VersionListParams {
    limit?: number;
  }

  export type CreateVersionBody =
    | (Record<string, unknown> & {
        config_json: RuntimeConfigDocument;
        reason: string;
      })
    | (Record<string, unknown> & {
        config_patch: RuntimeConfigPatch;
        reason: string;
      });

  export type GovernedReasonBody = Record<string, unknown> & {
    reason: string;
  };
}

/** `GET /runtime-config` — live applied config (credentials masked). */
export async function getCurrentRuntimeConfig() {
  return requestClient.get<RuntimeConfigCurrentView>(RuntimeConfigApi.base);
}

/** `GET /runtime-config/schema` — schema-driven form leaf metadata. */
export async function getRuntimeConfigSchema() {
  return requestClient.get<RuntimeConfigSchemaView>(RuntimeConfigApi.schema);
}

/** `GET /runtime-config/versions` — immutable version catalog. */
export async function fetchRuntimeConfigVersions(
  params?: RuntimeConfigApi.VersionListParams,
) {
  return requestClient.get<RuntimeConfigVersionView[]>(
    RuntimeConfigApi.versions,
    { params },
  );
}

/** `POST /runtime-config/versions` — governed immutable version creation. */
export async function createRuntimeConfigVersion(
  body: RuntimeConfigApi.CreateVersionBody,
  ctx: GovernedContext,
) {
  return governedPost<RuntimeConfigVersionView>(
    RuntimeConfigApi.versions,
    body,
    ctx,
  );
}

/** `POST /runtime-config/versions/{id}/activate` — governed promotion. */
export async function activateRuntimeConfigVersion(
  id: UuidString,
  body: RuntimeConfigApi.GovernedReasonBody,
  ctx: GovernedContext,
) {
  return governedPost<RuntimeConfigActivationInfo>(
    RuntimeConfigApi.activateVersion(id),
    body,
    ctx,
  );
}

/** `POST /runtime-config/versions/{id}/rollback` — governed rollback. */
export async function rollbackRuntimeConfigVersion(
  id: UuidString,
  body: RuntimeConfigApi.GovernedReasonBody,
  ctx: GovernedContext,
) {
  return governedPost<RuntimeConfigActivationInfo>(
    RuntimeConfigApi.rollbackVersion(id),
    body,
    ctx,
  );
}
