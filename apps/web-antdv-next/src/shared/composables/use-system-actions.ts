/**
 * Governed system control actions shared by the Command Center and the
 * header authorization-policy / kill-switch state lights.
 *
 * Both flows wrap the singleton governed-action modal (acting role + reason,
 * danger confirm words for emergency-grade transitions) and refresh the shared
 * `SystemStatus` store after a successful mutation so the header indicator,
 * dashboard, and system page converge without waiting for the next WS push.
 *
 * CAS revision is always the revision the operator saw when they opened the
 * action. Callers must pass that displayed revision; this module never rebinds
 * to a freshly fetched revision inside the submit closure.
 */
import type { ApiError } from '@vben/request/qp';
import type {
  EntryAuthorizationPolicy,
  EntryAuthorizationTransitionReport,
  KillSwitchState,
  KillSwitchView,
  RuntimeControlSnapshot,
  SettlementWritePolicy,
} from '@vben/types';

import { useRequestHandler } from '@vben/request/qp';
import {
  ENTRY_AUTHORIZATION_POLICIES,
  KILL_SWITCH_STATES,
  SETTLEMENT_WRITE_POLICIES,
} from '@vben/types';

import { message } from 'antdv-next';

import {
  getRuntimeControls,
  getSystemStatus,
  setEntryAuthorizationPolicy,
  setKillSwitch,
  switchSettlementWritePolicy,
} from '#/api/system';
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

export interface EntryAuthorizationPolicyActionApi {
  /** Whether the actor may change entry authorization policy. */
  canSwitch: boolean;
  /** Run the governed switch flow; resolves `null` on cancel/failure. */
  switchTo: (
    current: EntryAuthorizationPolicy | null,
    target: EntryAuthorizationPolicy,
    expectedRevision: number,
  ) => Promise<EntryAuthorizationTransitionReport | null>;
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
    expectedRevision: number,
  ) => Promise<KillSwitchView | null>;
}

export interface SettlementWritePolicyActionApi {
  canSwitch: boolean;
  switchTo: (
    current: null | SettlementWritePolicy,
    target: SettlementWritePolicy,
    expectedRevision: number,
  ) => Promise<null | RuntimeControlSnapshot>;
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
function useSystemTruthRefresh() {
  const systemStore = useSystemStore();
  const { handleRequest } = useRequestHandler();
  return async () => {
    await Promise.all([
      handleRequest(getSystemStatus, (status) => {
        systemStore.applyControlPlaneStatus(status);
      }),
      handleRequest(getRuntimeControls, (controls) => {
        systemStore.applyRuntimeControls(controls);
      }),
    ]);
  };
}

function refreshOnCasConflict(
  error: ApiError,
  refresh: () => Promise<void>,
): 'keep_open' {
  if (error.httpStatus === 409 || error.code === 409) {
    void refresh();
  }
  return 'keep_open';
}

/** Governed entry-authorization-policy transition. */
export function useEntryAuthorizationPolicyAction(): EntryAuthorizationPolicyActionApi {
  const { governed } = useGovernedAction();
  const { hasAccessByCodes } = useQpAccess();
  const refresh = useSystemTruthRefresh();

  const canSwitch = hasAccessByCodes(['system:update_runtime_control']);

  async function switchTo(
    current: EntryAuthorizationPolicy | null,
    target: EntryAuthorizationPolicy,
    expectedRevision: number,
  ): Promise<EntryAuthorizationTransitionReport | null> {
    const policyLabel = (policy: EntryAuthorizationPolicy | null) =>
      policy ? $t(`enum.entryAuthorizationPolicy.${policy}`) : '—';
    const danger = target === ENTRY_AUTHORIZATION_POLICIES.policyAutomatic;
    const result = await governed(
      async (ctx) =>
        setEntryAuthorizationPolicy(
          {
            expected_revision: expectedRevision,
            policy: target,
            reason: ctx.reason,
          },
          ctx,
        ),
      {
        confirmWord: danger ? 'AUTO' : undefined,
        danger,
        summary: $t('page.systemAdmin.entryAuthorizationPolicy.summary', {
          from: policyLabel(current),
          to: policyLabel(target),
        }),
        title: $t('page.systemAdmin.entryAuthorizationPolicy.switchTitle'),
        onError: (error) => refreshOnCasConflict(error, refresh),
      },
    );
    if (result) {
      message.success(
        $t('page.systemAdmin.entryAuthorizationPolicy.switched', {
          from: policyLabel(result.from),
          to: policyLabel(result.to),
        }),
      );
      await refresh();
    }
    return result;
  }

  return { canSwitch, switchTo };
}

/** Governed kill-switch transition (header indicator). */
export function useKillSwitchAction(): KillSwitchActionApi {
  const { governed } = useGovernedAction();
  const { hasAccessByCodes } = useQpAccess();
  const refresh = useSystemTruthRefresh();

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
    expectedRevision: number,
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
      async (ctx) =>
        setKillSwitch(
          {
            expected_revision: expectedRevision,
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
        onError: (error) => refreshOnCasConflict(error, refresh),
      },
    );
    if (result) {
      message.success(
        $t('page.systemAdmin.killSwitch.updated', {
          state: stateLabel(result.state),
        }),
      );
      await refresh();
    }
    return result;
  }

  return { canTransition, setTo };
}

export function useSettlementWritePolicyAction(): SettlementWritePolicyActionApi {
  const { governed } = useGovernedAction();
  const { hasAccessByCodes } = useQpAccess();
  const refresh = useSystemTruthRefresh();
  const canSwitch = hasAccessByCodes(['system:update_runtime_control']);

  async function switchTo(
    current: null | SettlementWritePolicy,
    target: SettlementWritePolicy,
    expectedRevision: number,
  ): Promise<null | RuntimeControlSnapshot> {
    const policyLabel = (policy: null | SettlementWritePolicy) =>
      policy ? $t(`enum.settlementWritePolicy.${policy}`) : '—';
    const danger = target === SETTLEMENT_WRITE_POLICIES.operatorApproval;
    const result = await governed(
      async (ctx) =>
        switchSettlementWritePolicy(
          {
            expected_revision: expectedRevision,
            policy: target,
            reason: ctx.reason,
          },
          ctx,
        ),
      {
        confirmWord: danger ? 'SETTLEMENT WRITE' : undefined,
        danger,
        onError: (error) => refreshOnCasConflict(error, refresh),
        summary: $t('page.systemAdmin.settlementWritePolicy.summary', {
          from: policyLabel(current),
          to: policyLabel(target),
        }),
        title: $t('page.systemAdmin.settlementWritePolicy.switchTitle'),
      },
    );
    if (result) {
      useSystemStore().applyRuntimeControls(result);
      message.success(
        $t('page.systemAdmin.settlementWritePolicy.switched', {
          policy: policyLabel(result.settlement_write_policy),
        }),
      );
      await refresh();
    }
    return result;
  }

  return { canSwitch, switchTo };
}
