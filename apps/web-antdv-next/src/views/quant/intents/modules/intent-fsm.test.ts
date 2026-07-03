import {
  intentActions,
  intentSubmitAllowed,
  isIntentSubmittableStatus,
  isIntentTerminal,
  ORDER_INTENT_STATUSES,
  QUANT_RUNTIME_MODES,
} from '@vben/types';

import { describe, expect, it } from 'vitest';

describe('intentActions FSM predicates', () => {
  it('pending_approval allows approve / reject / cancel', () => {
    const actions = intentActions(ORDER_INTENT_STATUSES.pendingApproval);
    expect(actions).toEqual({
      canApprove: true,
      canCancel: true,
      canReject: true,
    });
  });

  it('approved allows cancel, not approve / reject', () => {
    const actions = intentActions(ORDER_INTENT_STATUSES.approved);
    expect(actions).toEqual({
      canApprove: false,
      canCancel: true,
      canReject: false,
    });
  });

  it('approved_by_policy is cancelable but not approvable', () => {
    const actions = intentActions(ORDER_INTENT_STATUSES.approvedByPolicy);
    expect(actions.canCancel).toBe(true);
    expect(actions.canApprove).toBe(false);
  });

  it('admission_pending exposes no operator action (dispatcher-owned)', () => {
    const actions = intentActions(ORDER_INTENT_STATUSES.admissionPending);
    expect(actions).toEqual({
      canApprove: false,
      canCancel: false,
      canReject: false,
    });
  });

  it('submitted is in-flight — no actions, not terminal', () => {
    const actions = intentActions(ORDER_INTENT_STATUSES.submitted);
    expect(Object.values(actions).every((allowed) => !allowed)).toBe(true);
    expect(isIntentTerminal(ORDER_INTENT_STATUSES.submitted)).toBe(false);
  });

  it('terminal statuses expose no action and report terminal', () => {
    const terminals = [
      ORDER_INTENT_STATUSES.filled,
      ORDER_INTENT_STATUSES.rejected,
      ORDER_INTENT_STATUSES.cancelled,
      ORDER_INTENT_STATUSES.failed,
      ORDER_INTENT_STATUSES.expired,
      ORDER_INTENT_STATUSES.invalidated,
      ORDER_INTENT_STATUSES.admissionRejected,
    ];
    for (const status of terminals) {
      const actions = intentActions(status);
      expect(
        Object.values(actions).every((allowed) => !allowed),
        `${status} must expose no action`,
      ).toBe(true);
      expect(isIntentTerminal(status), `${status} must be terminal`).toBe(true);
    }
  });
});

describe('intentSubmitAllowed mode-aware gate', () => {
  it('report_only never submits (real-account sizing, not dry-run)', () => {
    expect(
      intentSubmitAllowed(
        ORDER_INTENT_STATUSES.approved,
        QUANT_RUNTIME_MODES.reportOnly,
      ),
    ).toBe(false);
    expect(
      intentSubmitAllowed(
        ORDER_INTENT_STATUSES.approvedByPolicy,
        QUANT_RUNTIME_MODES.reportOnly,
      ),
    ).toBe(false);
  });

  it('semi_auto submits an operator-approved intent only', () => {
    expect(
      intentSubmitAllowed(
        ORDER_INTENT_STATUSES.approved,
        QUANT_RUNTIME_MODES.semiAuto,
      ),
    ).toBe(true);
    expect(
      intentSubmitAllowed(
        ORDER_INTENT_STATUSES.approvedByPolicy,
        QUANT_RUNTIME_MODES.semiAuto,
      ),
    ).toBe(false);
  });

  it('auto_execution submits a policy-approved intent only', () => {
    expect(
      intentSubmitAllowed(
        ORDER_INTENT_STATUSES.approvedByPolicy,
        QUANT_RUNTIME_MODES.autoExecution,
      ),
    ).toBe(true);
    expect(
      intentSubmitAllowed(
        ORDER_INTENT_STATUSES.approved,
        QUANT_RUNTIME_MODES.autoExecution,
      ),
    ).toBe(false);
  });

  it('isIntentSubmittableStatus is the mode-agnostic precondition', () => {
    expect(isIntentSubmittableStatus(ORDER_INTENT_STATUSES.approved)).toBe(
      true,
    );
    expect(
      isIntentSubmittableStatus(ORDER_INTENT_STATUSES.approvedByPolicy),
    ).toBe(true);
    expect(isIntentSubmittableStatus(ORDER_INTENT_STATUSES.submitted)).toBe(
      false,
    );
    expect(
      isIntentSubmittableStatus(ORDER_INTENT_STATUSES.pendingApproval),
    ).toBe(false);
  });
});
