import type {
  AccountRecoveryIncidentView,
  ActionEligibilityView,
  EntryAuthorizationTransitionReport,
  ExchangeHistoryQuarantinePageView,
  ExchangeHistoryQuarantineQuery,
  FinalizeAccountRecoveryRequest,
  FreshBootProgressView,
  FreshBootRunDetailView,
  FreshBootRunProgressView,
  KillSwitchView,
  ReconcileAccountRecoveryRequest,
  RetryFreshBootRunRequest,
  RuntimeControlSnapshot,
  SealAccountRecoveryRequest,
  SetEntryAuthorizationPolicyRequest,
  SetKillSwitchRequest,
  SupersedeFreshBootRunRequest,
  SwitchSettlementWritePolicyRequest,
  SystemControlPlaneStatus,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { governedPost } from '#/api/governed-request';
import { requestClient } from '#/api/request';

export namespace SystemApi {
  export const base = '/system';
  export const status = `${base}/status`;
  export const actionEligibility = `${base}/action-eligibility`;
  export const freshBoot = `${base}/fresh-boot`;
  export const exchangeHistoryQuarantines = `${base}/exchange-history/quarantines`;
  export const runtimeControls = `${base}/runtime-controls`;
  export const entryAuthorizationPolicy = `${runtimeControls}/entry-authorization-policy`;
  export const settlementWritePolicy = `${runtimeControls}/settlement-write-policy`;
  export const killSwitch = `${runtimeControls}/kill-switch`;
  export const recoveryIncident = (id: string) =>
    `${base}/execution-recovery/incidents/${id}`;
  export const activeRecoveryIncident = `${base}/execution-recovery/incidents/active`;
}

export async function getAccountRecoveryIncident(id: string) {
  return requestClient.get<AccountRecoveryIncidentView>(
    SystemApi.recoveryIncident(id),
  );
}

export async function getActiveAccountRecoveryIncident() {
  return requestClient.get<AccountRecoveryIncidentView | null>(
    SystemApi.activeRecoveryIncident,
  );
}

export async function pauseAndReconcileAccountRecovery(
  id: string,
  body: ReconcileAccountRecoveryRequest,
  ctx: GovernedContext,
) {
  return governedPost<AccountRecoveryIncidentView>(
    `${SystemApi.recoveryIncident(id)}/pause-and-reconcile`,
    body,
    ctx,
  );
}

export async function sealAccountRecoveryIncident(
  id: string,
  body: SealAccountRecoveryRequest,
  ctx: GovernedContext,
) {
  return governedPost<AccountRecoveryIncidentView>(
    `${SystemApi.recoveryIncident(id)}/seal`,
    body,
    ctx,
  );
}

export async function unpauseAndFinalizeAccountRecovery(
  id: string,
  body: FinalizeAccountRecoveryRequest,
  ctx: GovernedContext,
) {
  return governedPost<AccountRecoveryIncidentView>(
    `${SystemApi.recoveryIncident(id)}/unpause-and-finalize`,
    body,
    ctx,
  );
}

/** `GET /system/status` — the operator system snapshot. */
export async function getSystemStatus() {
  return requestClient.get<SystemControlPlaneStatus>(SystemApi.status);
}

/** User-scoped RBAC and runtime-capability decisions for guarded actions. */
export async function getActionEligibility() {
  return requestClient.get<ActionEligibilityView>(SystemApi.actionEligibility);
}

/** Durable L2-free cold-start progress and first-report readiness. */
export async function getFreshBootProgress(
  options: { signal?: AbortSignal } = {},
) {
  return requestClient.get<FreshBootProgressView>(SystemApi.freshBoot, options);
}

/** Immutable typed quarantine evidence and governed replacement resolution. */
export async function getExchangeHistoryQuarantines(
  query: ExchangeHistoryQuarantineQuery = {},
  options: { signal?: AbortSignal } = {},
) {
  return requestClient.get<ExchangeHistoryQuarantinePageView>(
    SystemApi.exchangeHistoryQuarantines,
    { params: query, signal: options.signal },
  );
}

/** Immutable run projection and append-only transition timeline. */
export async function getFreshBootRun(
  runId: string,
  options: { signal?: AbortSignal } = {},
) {
  return requestClient.get<FreshBootRunDetailView>(
    `${SystemApi.freshBoot}/${runId}`,
    options,
  );
}

/** Accelerate a retryable wait without bypassing its current stage gate. */
export async function retryFreshBootRun(
  runId: string,
  body: RetryFreshBootRunRequest,
  ctx: GovernedContext,
) {
  return governedPost<FreshBootRunProgressView>(
    `${SystemApi.freshBoot}/${runId}/retry-now`,
    body,
    ctx,
  );
}

/** Replace an immutable terminal run with a governed fresh lineage. */
export async function supersedeFreshBootRun(
  runId: string,
  body: SupersedeFreshBootRunRequest,
  ctx: GovernedContext,
) {
  return governedPost<FreshBootRunProgressView>(
    `${SystemApi.freshBoot}/${runId}/supersede`,
    body,
    ctx,
  );
}

/** Atomic operational controls and their shared CAS revision. */
export async function getRuntimeControls() {
  return requestClient.get<RuntimeControlSnapshot>(SystemApi.runtimeControls);
}

/**
 * Governed entry-authorization transition. Callers should
 * wait for the WS `system.status` echo instead of optimistic local updates.
 */
export async function setEntryAuthorizationPolicy(
  body: SetEntryAuthorizationPolicyRequest,
  ctx: GovernedContext,
) {
  return governedPost<EntryAuthorizationTransitionReport>(
    SystemApi.entryAuthorizationPolicy,
    body,
    ctx,
  );
}

export async function switchSettlementWritePolicy(
  body: SwitchSettlementWritePolicyRequest,
  ctx: GovernedContext,
) {
  return governedPost<RuntimeControlSnapshot>(
    SystemApi.settlementWritePolicy,
    body,
    ctx,
  );
}

/**
 * `POST /system/kill-switch` — governed kill-switch transition. The required
 * permission (`halt` / `resume` / `emergency`) is derived server-side from the
 * requested `state`; `ack: true` is required to clear `emergency_halted`.
 */
export async function setKillSwitch(
  body: SetKillSwitchRequest,
  ctx: GovernedContext,
) {
  return governedPost<KillSwitchView>(SystemApi.killSwitch, body, ctx);
}
