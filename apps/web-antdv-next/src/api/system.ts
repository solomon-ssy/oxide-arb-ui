import type {
  ActionEligibilityView,
  FreshBootProgressView,
  FreshBootRunDetailView,
  FreshBootRunProgressView,
  KillSwitchView,
  QuantModeTransitionReport,
  RetryFreshBootRunRequest,
  RuntimeControlSnapshot,
  SetKillSwitchRequest,
  SupersedeFreshBootRunRequest,
  SwitchQuantModeRequest,
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
  export const runtimeControls = `${base}/runtime-controls`;
  export const quantMode = `${runtimeControls}/quant-mode`;
  export const settlementWritePolicy = `${runtimeControls}/settlement-write-policy`;
  export const killSwitch = `${runtimeControls}/kill-switch`;
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
 * `POST /system/quant-mode` — governed runtime mode hot-swap. Callers should
 * wait for the WS `system.status` echo instead of optimistic local updates.
 */
export async function switchQuantMode(
  body: SwitchQuantModeRequest,
  ctx: GovernedContext,
) {
  return governedPost<QuantModeTransitionReport>(
    SystemApi.quantMode,
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
