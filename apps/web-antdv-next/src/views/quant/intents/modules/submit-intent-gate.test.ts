import type { SubmitIntentGateInput } from '@vben/types';

import {
  evaluateSubmitIntentGate,
  KILL_SWITCH_STATES,
  ORDER_INTENT_STATUSES,
  QUANT_RUNTIME_MODES,
} from '@vben/types';

import { describe, expect, it } from 'vitest';

const NOW = Date.parse('2026-07-03T12:00:00.000Z');

function input(
  overrides: Partial<SubmitIntentGateInput> = {},
): SubmitIntentGateInput {
  return {
    autoExecutionBlocked: false,
    canSubmit: true,
    expiresAt: '2026-07-03T13:00:00.000Z',
    killSwitchState: KILL_SWITCH_STATES.closed,
    now: NOW,
    runtimeMode: QUANT_RUNTIME_MODES.semiAuto,
    status: ORDER_INTENT_STATUSES.approved,
    ...overrides,
  };
}

describe('evaluateSubmitIntentGate', () => {
  it('enables a semi-auto operator submit of an approved intent', () => {
    expect(evaluateSubmitIntentGate(input())).toEqual({
      enabled: true,
      reason: null,
    });
  });

  it('blocks on missing permission first', () => {
    expect(evaluateSubmitIntentGate(input({ canSubmit: false })).reason).toBe(
      'permission',
    );
  });

  it('blocks a non-submittable status', () => {
    expect(
      evaluateSubmitIntentGate(
        input({ status: ORDER_INTENT_STATUSES.pendingApproval }),
      ).reason,
    ).toBe('notSubmittable');
  });

  it('blocks in report_only mode (not dry-run) and before mode is known', () => {
    expect(
      evaluateSubmitIntentGate(
        input({ runtimeMode: QUANT_RUNTIME_MODES.reportOnly }),
      ).reason,
    ).toBe('mode');
    expect(evaluateSubmitIntentGate(input({ runtimeMode: null })).reason).toBe(
      'mode',
    );
  });

  it('blocks a mode/approval provenance mismatch', () => {
    expect(
      evaluateSubmitIntentGate(
        input({
          runtimeMode: QUANT_RUNTIME_MODES.autoExecution,
          status: ORDER_INTENT_STATUSES.approved,
        }),
      ).reason,
    ).toBe('modeApprovalMismatch');
  });

  it('blocks when the kill-switch is not closed', () => {
    expect(
      evaluateSubmitIntentGate(
        input({ killSwitchState: KILL_SWITCH_STATES.executionHalted }),
      ).reason,
    ).toBe('killSwitch');
  });

  it('blocks an auto-execution submit while recovery holds the plane', () => {
    expect(
      evaluateSubmitIntentGate(
        input({
          autoExecutionBlocked: true,
          runtimeMode: QUANT_RUNTIME_MODES.autoExecution,
          status: ORDER_INTENT_STATUSES.approvedByPolicy,
        }),
      ).reason,
    ).toBe('recoveryBlocked');
  });

  it('blocks a past-deadline intent', () => {
    expect(
      evaluateSubmitIntentGate(input({ expiresAt: '2026-07-03T11:59:59.000Z' }))
        .reason,
    ).toBe('expired');
  });
});
