import {
  intentActions,
  isIntentTerminal,
  ORDER_INTENT_STATUSES,
} from '@vben/types';

import { describe, expect, it } from 'vitest';

describe('intentActions FSM predicates', () => {
  it('pending_authorization allows approve / reject / cancel', () => {
    const actions = intentActions(ORDER_INTENT_STATUSES.pendingAuthorization);
    expect(actions).toEqual({
      canApprove: true,
      canCancel: true,
      canReject: true,
    });
  });

  it('authorized allows cancel, not approve / reject', () => {
    const actions = intentActions(ORDER_INTENT_STATUSES.authorized);
    expect(actions).toEqual({
      canApprove: false,
      canCancel: true,
      canReject: false,
    });
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
      ORDER_INTENT_STATUSES.authorizationRejected,
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
