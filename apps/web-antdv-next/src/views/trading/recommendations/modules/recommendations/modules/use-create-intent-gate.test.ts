import type { CreateIntentGateInput } from './use-create-intent-gate';

import {
  ENTRY_AUTHORIZATION_POLICIES,
  KILL_SWITCH_STATES,
  RECOMMENDATION_REPORT_STATUSES,
  RECOMMENDATION_STATUSES,
} from '@vben/types';

import { describe, expect, it } from 'vitest';

import { evaluateCreateIntentGate } from './use-create-intent-gate';

const NOW = Date.parse('2026-07-03T12:00:00.000Z');

function recommendation(
  overrides: Partial<CreateIntentGateInput['recommendation']> = {},
): CreateIntentGateInput['recommendation'] {
  return {
    active_order_intent_id: null,
    execution_eligibility: {
      blockers: [],
      ceiling: 'policy_automatic',
      policy_binding: 'policy-v1',
    },
    report_status: RECOMMENDATION_REPORT_STATUSES.published,
    trade_plan: {
      risk_envelope: {
        max_loss_usd: '100',
        max_position_usd: '500',
      },
    },
    status: RECOMMENDATION_STATUSES.published,
    valid_from: '2026-07-03T11:00:00.000Z',
    valid_until: '2026-07-03T13:00:00.000Z',
    ...overrides,
  };
}

function input(
  overrides: Partial<CreateIntentGateInput> = {},
): CreateIntentGateInput {
  return {
    canCreate: true,
    entryAuthorizationPolicy:
      ENTRY_AUTHORIZATION_POLICIES.operatorApprovalRequired,
    killSwitchState: KILL_SWITCH_STATES.closed,
    now: NOW,
    recommendation: recommendation(),
    ...overrides,
  };
}

describe('evaluateCreateIntentGate', () => {
  it('enables when every invariant holds', () => {
    expect(evaluateCreateIntentGate(input())).toEqual({
      enabled: true,
      reason: null,
    });
  });

  it('blocks on missing permission first', () => {
    expect(evaluateCreateIntentGate(input({ canCreate: false })).reason).toBe(
      'permission',
    );
  });

  it('blocks before the authorization policy is known', () => {
    expect(
      evaluateCreateIntentGate(input({ entryAuthorizationPolicy: null }))
        .reason,
    ).toBe('authorizationPolicy');
  });

  it('blocks when the kill-switch is not closed', () => {
    expect(
      evaluateCreateIntentGate(
        input({ killSwitchState: KILL_SWITCH_STATES.exitOnly }),
      ).reason,
    ).toBe('killSwitch');
  });

  it('blocks before the kill-switch state is known', () => {
    expect(
      evaluateCreateIntentGate(input({ killSwitchState: null })).reason,
    ).toBe('killSwitch');
  });

  it('blocks when the recommendation is analysis only', () => {
    const rec = recommendation({
      execution_eligibility: {
        blockers: [],
        ceiling: 'analysis_only',
        policy_binding: null,
      },
    });
    expect(
      evaluateCreateIntentGate(
        input({
          recommendation: rec,
        }),
      ).reason,
    ).toBe('eligibility');
  });

  it('blocks policy automatic authorization when blockers are present', () => {
    const rec = recommendation({
      execution_eligibility: {
        blockers: ['automation_cap_exceeded'],
        ceiling: 'policy_automatic',
        policy_binding: 'policy-v1',
      },
    });
    expect(
      evaluateCreateIntentGate(
        input({
          recommendation: rec,
          entryAuthorizationPolicy:
            ENTRY_AUTHORIZATION_POLICIES.policyAutomatic,
        }),
      ).reason,
    ).toBe('eligibility');
  });

  it('allows operator approval below a policy-automatic ceiling', () => {
    const rec = recommendation({
      execution_eligibility: {
        blockers: ['automation_cap_exceeded'],
        ceiling: 'policy_automatic',
        policy_binding: 'policy-v1',
      },
    });
    expect(
      evaluateCreateIntentGate(
        input({
          recommendation: rec,
          entryAuthorizationPolicy:
            ENTRY_AUTHORIZATION_POLICIES.operatorApprovalRequired,
        }),
      ).enabled,
    ).toBe(true);
  });

  it('blocks when the risk envelope has a non-positive cap', () => {
    const rec = recommendation({
      trade_plan: {
        risk_envelope: {
          max_loss_usd: '0',
          max_position_usd: '500',
        },
      },
    });
    expect(
      evaluateCreateIntentGate(input({ recommendation: rec })).reason,
    ).toBe('riskEnvelope');
  });

  it('blocks before the validity window opens', () => {
    expect(
      evaluateCreateIntentGate(
        input({ now: Date.parse('2026-07-03T10:00:00.000Z') }),
      ).reason,
    ).toBe('validity');
  });

  it('blocks after the validity window closes', () => {
    expect(
      evaluateCreateIntentGate(
        input({ now: Date.parse('2026-07-03T14:00:00.000Z') }),
      ).reason,
    ).toBe('validity');
  });

  it('blocks when the parent report is no longer published', () => {
    expect(
      evaluateCreateIntentGate(
        input({
          recommendation: recommendation({
            report_status: RECOMMENDATION_REPORT_STATUSES.revoked,
          }),
        }),
      ).reason,
    ).toBe('reportStatus');
  });

  it('blocks when the recommendation itself is revoked', () => {
    expect(
      evaluateCreateIntentGate(
        input({
          recommendation: recommendation({
            status: RECOMMENDATION_STATUSES.revoked,
          }),
        }),
      ).reason,
    ).toBe('recommendationStatus');
  });

  it('blocks when a blocking intent already exists', () => {
    expect(
      evaluateCreateIntentGate(
        input({
          recommendation: recommendation({
            active_order_intent_id: '018f0000-0000-7000-8000-000000000000',
          }),
        }),
      ).reason,
    ).toBe('activeIntent');
  });

  it('allows an intent_created recommendation with no blocking intent', () => {
    expect(
      evaluateCreateIntentGate(
        input({
          recommendation: recommendation({
            active_order_intent_id: null,
            status: RECOMMENDATION_STATUSES.intentCreated,
          }),
        }),
      ).enabled,
    ).toBe(true);
  });
});
