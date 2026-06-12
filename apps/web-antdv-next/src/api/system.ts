import type {
  HaltRequest,
  HealthReport,
  ModeTransitionReport,
  ResumeRequest,
  SwitchModeRequest,
  SystemStatus,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { governedPost } from '#/api/governed-request';
import { requestClient } from '#/api/request';

export namespace SystemApi {
  export const base = '/system';
  export const status = `${base}/status`;
  export const health = `${base}/health`;
  export const halt = `${base}/halt`;
  export const resume = `${base}/resume`;
  export const mode = `${base}/mode`;
}

/** `GET /system/status` — execution mode / breaker / exposure snapshot. */
export async function getSystemStatus() {
  return requestClient.get<SystemStatus>(SystemApi.status);
}

/** `GET /system/health` — per-subsystem health report. */
export async function getSystemHealth() {
  return requestClient.get<HealthReport>(SystemApi.health);
}

/**
 * `POST /system/halt` — risk halt + execution kill switch. Requires a reason
 * (recorded on the operation log) but no acting role (not governed).
 */
export async function haltSystem(body: HaltRequest) {
  return requestClient.post<null>(SystemApi.halt, body);
}

/**
 * `POST /system/resume` — resume trading after an operator acknowledgement
 * string (recorded on the risk audit). Not governed.
 */
export async function resumeSystem(body: ResumeRequest) {
  return requestClient.post<null>(SystemApi.resume, body);
}

/**
 * `POST /system/mode` — governed runtime execution-mode hot-swap
 * (`X-Acting-Role` + reason). Callers must wait for the WS `system.status`
 * echo instead of optimistically updating local state.
 */
export async function switchExecutionMode(
  body: SwitchModeRequest,
  ctx: GovernedContext,
) {
  return governedPost<ModeTransitionReport>(
    SystemApi.mode,
    { mode: body.mode, reason: body.reason },
    ctx,
  );
}
