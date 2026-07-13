import type { QuantRecommendationView } from '@vben/types';

import type { CreateIntentGateInput } from './use-create-intent-gate';

import {
  KILL_SWITCH_STATES,
  QUANT_RUNTIME_MODES,
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
      approval_required: false,
      auto_policy_id: null,
      eligible_modes: [
        QUANT_RUNTIME_MODES.semiAuto,
        QUANT_RUNTIME_MODES.autoExecution,
      ],
      ineligibility_reasons: [],
      uncalibrated_watermark: false,
    },
    report_status: RECOMMENDATION_REPORT_STATUSES.published,
    trade_plan: {
      kind: 'frozen',
      risk_envelope: {
        max_loss_usd: '100',
        max_position_usd: '500',
      },
    } as QuantRecommendationView['trade_plan'],
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
    killSwitchState: KILL_SWITCH_STATES.closed,
    now: NOW,
    recommendation: recommendation(),
    runtimeMode: QUANT_RUNTIME_MODES.semiAuto,
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

  it('blocks in report_only mode (not dry-run)', () => {
    expect(
      evaluateCreateIntentGate(
        input({ runtimeMode: QUANT_RUNTIME_MODES.reportOnly }),
      ).reason,
    ).toBe('mode');
  });

  it('blocks before the runtime mode is known', () => {
    expect(evaluateCreateIntentGate(input({ runtimeMode: null })).reason).toBe(
      'mode',
    );
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

  it('blocks when the current mode is not eligible', () => {
    const rec = recommendation({
      execution_eligibility: {
        approval_required: false,
        auto_policy_id: null,
        eligible_modes: [QUANT_RUNTIME_MODES.autoExecution],
        ineligibility_reasons: [],
        uncalibrated_watermark: false,
      },
    });
    expect(
      evaluateCreateIntentGate(
        input({
          recommendation: rec,
          runtimeMode: QUANT_RUNTIME_MODES.semiAuto,
        }),
      ).reason,
    ).toBe('eligibility');
  });

  it('blocks auto_execution when ineligibility reasons are present', () => {
    const rec = recommendation({
      execution_eligibility: {
        approval_required: false,
        auto_policy_id: null,
        eligible_modes: [
          QUANT_RUNTIME_MODES.semiAuto,
          QUANT_RUNTIME_MODES.autoExecution,
        ],
        ineligibility_reasons: ['low_confidence'],
        uncalibrated_watermark: false,
      },
    });
    expect(
      evaluateCreateIntentGate(
        input({
          recommendation: rec,
          runtimeMode: QUANT_RUNTIME_MODES.autoExecution,
        }),
      ).reason,
    ).toBe('eligibility');
  });

  it('allows semi_auto even when ineligibility reasons are present', () => {
    const rec = recommendation({
      execution_eligibility: {
        approval_required: true,
        auto_policy_id: null,
        eligible_modes: [QUANT_RUNTIME_MODES.semiAuto],
        ineligibility_reasons: ['low_confidence'],
        uncalibrated_watermark: false,
      },
    });
    expect(
      evaluateCreateIntentGate(
        input({
          recommendation: rec,
          runtimeMode: QUANT_RUNTIME_MODES.semiAuto,
        }),
      ).enabled,
    ).toBe(true);
  });

  it('blocks when the risk envelope has a non-positive cap', () => {
    const rec = recommendation({
      trade_plan: {
        kind: 'frozen',
        risk_envelope: {
          max_loss_usd: '0',
          max_position_usd: '500',
        },
      } as QuantRecommendationView['trade_plan'],
    });
    expect(
      evaluateCreateIntentGate(input({ recommendation: rec })).reason,
    ).toBe('riskEnvelope');
  });

  it('blocks an unavailable trade plan', () => {
    const rec = recommendation({
      trade_plan: {
        blockers: ['artifact_not_published'],
        kind: 'unavailable',
      },
    });
    expect(evaluateCreateIntentGate(input({ recommendation: rec }))).toEqual({
      enabled: false,
      reason: 'tradePlan',
    });
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
