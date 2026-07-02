/**
 * Governed system control actions shared by the Command Center and the
 * header runtime-mode / kill-switch state lights.
 *
 * Both flows wrap the singleton governed-action modal (acting role + reason,
 * danger confirm words for emergency-grade transitions) and refresh the shared
 * `SystemStatus` store after a successful mutation so the header indicator,
 * dashboard, and system page converge without waiting for the next WS push.
 */
import type {
  KillSwitchState,
  KillSwitchView,
  QuantModeTransitionReport,
  QuantRuntimeMode,
} from '@vben/types';

import { useRequestHandler } from '@vben/request/qp';
import { KILL_SWITCH_STATES, QUANT_RUNTIME_MODES } from '@vben/types';

import { message } from 'antdv-next';

import { getSystemStatus, setKillSwitch, switchQuantMode } from '#/api/system';
import { $t } from '#/locales';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useSystemStore } from '#/store';

/**
 * Monotone kill-switch restriction strength (mirrors Rust
 * `KillSwitchState::restriction_rank`): higher blocks strictly more execution.
 */
const KILL_SWITCH_RESTRICTION_RANK: Record<KillSwitchState, number> = {
  [KILL_SWITCH_STATES.closed]: 0,
  [KILL_SWITCH_STATES.emergencyHalted]: 3,
  [KILL_SWITCH_STATES.executionHalted]: 2,
  [KILL_SWITCH_STATES.exitOnly]: 1,
  [KILL_SWITCH_STATES.reportOnlyForced]: 1,
};

/**
 * The permission a kill-switch transition requires (mirrors the backend
 * `required_kill_switch_op` deferred-authorization rule): emergency entry or
 * exit → `system:emergency`; strict loosening → `system:resume`; tightening or
 * holding rank → `system:halt`.
 */
export function requiredKillSwitchPermission(
  current: KillSwitchState,
  target: KillSwitchState,
): string {
  if (
    target === KILL_SWITCH_STATES.emergencyHalted ||
    current === KILL_SWITCH_STATES.emergencyHalted
  ) {
    return 'system:emergency';
  }
  return KILL_SWITCH_RESTRICTION_RANK[target] <
    KILL_SWITCH_RESTRICTION_RANK[current]
    ? 'system:resume'
    : 'system:halt';
}

export interface QuantModeActionApi {
  /** Whether the actor may switch modes at all (`system:switch_mode`). */
  canSwitch: boolean;
  /** Run the governed switch flow; resolves `null` on cancel/failure. */
  switchTo: (
    current: null | QuantRuntimeMode,
    target: QuantRuntimeMode,
  ) => Promise<null | QuantModeTransitionReport>;
}

export interface KillSwitchActionApi {
  /** Whether the actor may perform this specific transition. */
  canTransition: (
    current: KillSwitchState | null | undefined,
    target: KillSwitchState,
  ) => boolean;
  /** Run the governed transition flow; resolves `null` on cancel/failure. */
  setTo: (
    current: KillSwitchView | null,
    target: KillSwitchState,
  ) => Promise<KillSwitchView | null>;
}

/** Danger confirm word for a kill-switch transition (emergency > ack clear). */
function killSwitchConfirmWord(
  enteringEmergency: boolean,
  needsAck: boolean,
): string | undefined {
  if (enteringEmergency) {
    return 'EMERGENCY';
  }
  return needsAck ? 'ACK' : undefined;
}

/** Refresh the shared system status after a governed control-plane mutation. */
function useSystemStatusRefresh() {
  const systemStore = useSystemStore();
  const { handleRequest } = useRequestHandler();
  return async () => {
    await handleRequest(getSystemStatus, (status) => {
      systemStore.applySystemStatus(status);
    });
  };
}

/** Governed quant runtime mode switch (header indicator + dashboard). */
export function useQuantModeAction(): QuantModeActionApi {
  const { governed } = useGovernedAction();
  const { hasAccessByCodes } = useQpAccess();
  const refreshStatus = useSystemStatusRefresh();

  const canSwitch = hasAccessByCodes(['system:switch_mode']);

  async function switchTo(
    current: null | QuantRuntimeMode,
    target: QuantRuntimeMode,
  ): Promise<null | QuantModeTransitionReport> {
    const modeLabel = (mode: null | QuantRuntimeMode) =>
      mode ? $t(`enum.quantRuntimeMode.${mode}`) : '—';
    // Enabling unattended execution is the highest-consequence upgrade.
    const danger = target === QUANT_RUNTIME_MODES.autoExecution;
    const result = await governed(
      (ctx) => switchQuantMode({ mode: target, reason: ctx.reason }, ctx),
      {
        confirmWord: danger ? 'AUTO' : undefined,
        danger,
        summary: $t('page.systemAdmin.mode.summary', {
          from: modeLabel(current),
          to: modeLabel(target),
        }),
        title: $t('page.systemAdmin.mode.switchTitle'),
      },
    );
    if (result) {
      message.success(
        $t('page.systemAdmin.mode.switched', {
          from: modeLabel(result.from),
          to: modeLabel(result.to),
        }),
      );
      await refreshStatus();
    }
    return result;
  }

  return { canSwitch, switchTo };
}

/** Governed kill-switch transition (header indicator). */
export function useKillSwitchAction(): KillSwitchActionApi {
  const { governed } = useGovernedAction();
  const { hasAccessByCodes } = useQpAccess();
  const refreshStatus = useSystemStatusRefresh();

  function canTransition(
    current: KillSwitchState | null | undefined,
    target: KillSwitchState,
  ): boolean {
    if (!current || current === target) {
      return false;
    }
    return hasAccessByCodes([requiredKillSwitchPermission(current, target)]);
  }

  async function setTo(
    current: KillSwitchView | null,
    target: KillSwitchState,
  ): Promise<KillSwitchView | null> {
    const stateLabel = (state: KillSwitchState) =>
      $t(`enum.killSwitchState.${state}`);
    const enteringEmergency = target === KILL_SWITCH_STATES.emergencyHalted;
    const clearingLatched =
      (current?.requires_operator_ack ?? false) ||
      current?.state === KILL_SWITCH_STATES.emergencyHalted;
    const needsAck = clearingLatched && !enteringEmergency;

    let summary = $t('page.systemAdmin.killSwitch.summary', {
      from: current ? stateLabel(current.state) : '—',
      to: stateLabel(target),
    });
    if (needsAck) {
      summary = `${summary} ${$t('page.systemAdmin.killSwitch.ackSummary')}`;
    }

    const result = await governed(
      (ctx) =>
        setKillSwitch(
          {
            reason: ctx.reason,
            state: target,
            ...(needsAck ? { ack: true } : {}),
          },
          ctx,
        ),
      {
        confirmWord: killSwitchConfirmWord(enteringEmergency, needsAck),
        danger: enteringEmergency || needsAck,
        summary,
        title: $t('page.systemAdmin.killSwitch.setTitle'),
      },
    );
    if (result) {
      message.success(
        $t('page.systemAdmin.killSwitch.updated', {
          state: stateLabel(result.state),
        }),
      );
      await refreshStatus();
    }
    return result;
  }

  return { canTransition, setTo };
}
