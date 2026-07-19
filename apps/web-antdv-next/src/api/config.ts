import type {
  ActivatePolicyDraftRequest,
  ApprovePolicyDraftRequest,
  ConfigActivityView,
  ConfigResourceKind,
  ConfigResourcesView,
  CreatePolicyDraftRequest,
  CurrentPolicyResourceView,
  DeploymentConfigView,
  LifecycleView,
  PolicyActivationResultView,
  PolicyApprovalView,
  PolicyResourceSchemaView,
  PolicyRevisionView,
  PolicyValidationView,
  ProductionSealEvidenceView,
  SchedulePreviewRequest,
  SchedulePreviewView,
  SealProductionRequest,
  ValidatePolicyDraftRequest,
} from '@vben/types/config-api';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { governedPost } from '#/api/governed-request';
import { requestClient } from '#/api/request';

export namespace ConfigApi {
  export const base = '/config';
  export const resources = `${base}/resources`;
  export const activity = `${base}/activity`;
  export const deployment = `${base}/deployment`;
  export const lifecycle = `${base}/lifecycle`;
  export const schedulePreview = `${base}/schedule-preview`;

  export const current = (kind: ConfigResourceKind) =>
    `${base}/${kind}/current`;
  export const schema = (kind: ConfigResourceKind) => `${base}/${kind}/schema`;
  export const revisions = (kind: ConfigResourceKind) =>
    `${base}/${kind}/revisions`;
  export const drafts = (kind: ConfigResourceKind) => `${base}/${kind}/drafts`;
  export const validateDraft = (kind: ConfigResourceKind, revisionId: string) =>
    `${drafts(kind)}/${revisionId}/validate`;
  export const approveDraft = (kind: ConfigResourceKind, revisionId: string) =>
    `${drafts(kind)}/${revisionId}/approve`;
  export const activateDraft = (kind: ConfigResourceKind, revisionId: string) =>
    `${drafts(kind)}/${revisionId}/activate`;
  export const rollbackRevision = (
    kind: ConfigResourceKind,
    revisionId: string,
  ) => `${revisions(kind)}/${revisionId}/rollback`;
}

export function getConfigResources() {
  return requestClient.get<ConfigResourcesView>(ConfigApi.resources);
}

export function getCurrentConfigResource(kind: ConfigResourceKind) {
  return requestClient.get<CurrentPolicyResourceView>(ConfigApi.current(kind));
}

export function getConfigResourceSchema(kind: ConfigResourceKind) {
  return requestClient.get<PolicyResourceSchemaView>(ConfigApi.schema(kind));
}

export function getConfigRevisions(kind: ConfigResourceKind, limit = 50) {
  return requestClient.get<PolicyRevisionView[]>(ConfigApi.revisions(kind), {
    params: { limit },
  });
}

export function createConfigDraft(
  kind: ConfigResourceKind,
  body: CreatePolicyDraftRequest,
  ctx: GovernedContext,
) {
  return governedPost<PolicyRevisionView>(ConfigApi.drafts(kind), body, ctx);
}

export function validateConfigDraft(
  kind: ConfigResourceKind,
  revisionId: string,
  body: ValidatePolicyDraftRequest,
  ctx: GovernedContext,
) {
  return governedPost<PolicyValidationView>(
    ConfigApi.validateDraft(kind, revisionId),
    body,
    ctx,
  );
}

export function approveConfigDraft(
  kind: ConfigResourceKind,
  revisionId: string,
  body: ApprovePolicyDraftRequest,
  ctx: GovernedContext,
) {
  return governedPost<PolicyApprovalView>(
    ConfigApi.approveDraft(kind, revisionId),
    body,
    ctx,
  );
}

export function activateConfigDraft(
  kind: ConfigResourceKind,
  revisionId: string,
  body: ActivatePolicyDraftRequest,
  ctx: GovernedContext,
) {
  return governedPost<PolicyActivationResultView>(
    ConfigApi.activateDraft(kind, revisionId),
    body,
    ctx,
  );
}

export function rollbackConfigRevision(
  kind: ConfigResourceKind,
  revisionId: string,
  body: ActivatePolicyDraftRequest,
  ctx: GovernedContext,
) {
  return governedPost<PolicyActivationResultView>(
    ConfigApi.rollbackRevision(kind, revisionId),
    body,
    ctx,
  );
}

export function getConfigActivity(limit = 50) {
  return requestClient.get<ConfigActivityView[]>(ConfigApi.activity, {
    params: { limit },
  });
}

export interface DecisionPolicySnapshotOption {
  activated_at: string;
  decision_policy_snapshot_id: string;
}

/**
 * Derive immutable snapshot options from the typed activation activity stream.
 * One bounded backend query replaces the old version-list endpoint and avoids
 * per-resource or per-revision follow-up requests.
 */
export async function fetchDecisionPolicySnapshots({ limit = 200 } = {}) {
  const activity = await getConfigActivity(limit);
  const snapshots = new Map<string, DecisionPolicySnapshotOption>();

  for (const item of activity) {
    if (item.event_type !== 'activation') {
      continue;
    }
    const snapshotId = item.event.decision_policy_snapshot_id;
    if (!snapshots.has(snapshotId)) {
      snapshots.set(snapshotId, {
        activated_at: item.event.activated_at,
        decision_policy_snapshot_id: snapshotId,
      });
    }
  }

  return [...snapshots.values()];
}

export function getDeploymentConfigSnapshot() {
  return requestClient.get<DeploymentConfigView>(ConfigApi.deployment);
}

export function getProjectLifecycle() {
  return requestClient.get<LifecycleView>(ConfigApi.lifecycle);
}

export function sealProductionBaseline(
  body: SealProductionRequest,
  ctx: GovernedContext,
) {
  return governedPost<ProductionSealEvidenceView>(
    `${ConfigApi.lifecycle}/seal-production`,
    body,
    ctx,
  );
}

export function previewConfigSchedule(body: SchedulePreviewRequest) {
  return requestClient.post<SchedulePreviewView>(
    ConfigApi.schedulePreview,
    body,
  );
}
