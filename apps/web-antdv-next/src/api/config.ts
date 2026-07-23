import type {
  ActivatePolicyDraftRequest,
  ApprovePolicyDraftRequest,
  ConfigActivityView,
  ConfigResourceKind,
  ConfigResourcesView,
  CreatePolicyDraftRequest,
  CurrentPolicyResourceView,
  DecisionPolicySnapshotOptionView,
  DeploymentConfigView,
  PolicyActivationResultView,
  PolicyApprovalView,
  PolicyResourceSchemaView,
  PolicyRevisionView,
  PolicyValidationView,
  SchedulePreviewRequest,
  SchedulePreviewView,
  ValidatePolicyDraftRequest,
} from '@vben/types/config-api';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { governedPost } from '#/api/governed-request';
import { requestClient } from '#/api/request';

export namespace ConfigApi {
  export const base = '/config';
  export const resources = `${base}/resources`;
  export const activity = `${base}/activity`;
  export const snapshotOptions = `${base}/snapshot-options`;
  export const deployment = `${base}/deployment`;
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

export function fetchDecisionPolicySnapshots({ limit = 200 } = {}) {
  return requestClient.get<DecisionPolicySnapshotOptionView[]>(
    ConfigApi.snapshotOptions,
    { params: { limit } },
  );
}

export function getDeploymentConfigSnapshot() {
  return requestClient.get<DeploymentConfigView>(ConfigApi.deployment);
}

export function previewConfigSchedule(body: SchedulePreviewRequest) {
  return requestClient.post<SchedulePreviewView>(
    ConfigApi.schedulePreview,
    body,
  );
}
