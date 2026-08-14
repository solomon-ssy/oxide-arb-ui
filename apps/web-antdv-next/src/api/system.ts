import type {
  ActionEligibilityView,
  KillSwitchView,
  QuantModeTransitionReport,
  RuntimeControlSnapshot,
  SetKillSwitchRequest,
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
