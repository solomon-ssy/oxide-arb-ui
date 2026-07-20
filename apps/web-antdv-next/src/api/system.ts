import type {
  ActionEligibilityView,
  ActivateBootstrapRequest,
  BootstrapView,
  ExecutionRecoveryView,
  HealthReport,
  KillSwitchView,
  QuantModeTransitionReport,
  QuantModeView,
  SetKillSwitchRequest,
  SwitchQuantModeRequest,
  SystemControlPlaneStatus,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { governedPost } from '#/api/governed-request';
import { requestClient } from '#/api/request';

export namespace SystemApi {
  export const base = '/system';
  export const status = `${base}/status`;
  export const actionEligibility = `${base}/action-eligibility`;
  export const activateBootstrap = `${base}/bootstrap/activate`;
  export const health = `${base}/health`;
  export const quantMode = `${base}/quant-mode`;
  export const killSwitch = `${base}/kill-switch`;
  export const executionRecovery = `${base}/execution-recovery`;
}

/** `GET /system/status` — the operator system snapshot. */
export async function getSystemStatus() {
  return requestClient.get<SystemControlPlaneStatus>(SystemApi.status);
}

/** User-scoped RBAC and runtime-capability decisions for guarded actions. */
export async function getActionEligibility() {
  return requestClient.get<ActionEligibilityView>(SystemApi.actionEligibility);
}

/** Governed transition from `awaiting_activation` to `active`. */
export async function activateBootstrap(
  body: ActivateBootstrapRequest,
  ctx: GovernedContext,
) {
  return governedPost<BootstrapView>(SystemApi.activateBootstrap, body, ctx);
}

/** `GET /system/health` — per-subsystem health report. */
export async function getSystemHealth() {
  return requestClient.get<HealthReport>(SystemApi.health);
}

/** `GET /system/quant-mode` — the current runtime mode. */
export async function getQuantMode() {
  return requestClient.get<QuantModeView>(SystemApi.quantMode);
}

/** `GET /system/kill-switch` — the current kill-switch state. */
export async function getKillSwitch() {
  return requestClient.get<KillSwitchView>(SystemApi.killSwitch);
}

/** `GET /system/execution-recovery` — recovery detail with blocking rows. */
export async function getExecutionRecovery() {
  return requestClient.get<ExecutionRecoveryView>(SystemApi.executionRecovery);
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
