import type { FeedbackCycleView } from '@vben/types';

import { describe, expect, it } from 'vitest';

import {
  canCancelFeedbackCycle,
  canIssuePromotionPermit,
  canonicalPromotionModes,
  parsePromotionExpiry,
  releaseFeedbackAction,
  tryBeginFeedbackAction,
  validateFeedbackReason,
} from './feedback-action-state';

function cycle(
  status: FeedbackCycleView['status'],
  decision: FeedbackCycleView['decision'],
): FeedbackCycleView {
  return {
    feedback_cycle_id: 'cycle-1',
    idempotency_hash: 'blake3:idempotency',
    trigger_family: 'manual',
    profile_ref: {
      content_hash: 'blake3:profile',
      id: 'crypto',
      version: 1,
    },
    research_profile_artifact_id: 'profile-artifact-1',
    feedback_policy_hash: 'blake3:policy',
    label_cutoff: '2026-07-28T00:00:00Z',
    capability_registry_hashes: ['blake3:capability'],
    champion_model_version_id: 'model-version-1',
    champion_serving_contract_hash: 'blake3:serving',
    candidate_family: {},
    candidate_family_hash: 'blake3:family',
    status,
    decision,
    terminal_reason_code: null,
    generation: 0,
    lease_expires_at: null,
    cancel_requested_at: null,
    started_at: null,
    completed_at: null,
    created_at: '2026-07-28T00:00:00Z',
    updated_at: '2026-07-28T00:00:00Z',
  };
}

describe('feedback governed action state', () => {
  it('accepts only the backend feedback reason grammar', () => {
    expect(validateFeedbackReason('operator_retry.1')).toBe('operator_retry.1');
    for (const invalid of [
      '',
      'UPPERCASE',
      'contains space',
      'a'.repeat(129),
    ]) {
      expect(() => validateFeedbackReason(invalid)).toThrow(TypeError);
    }
  });

  it('canonicalizes a non-empty runtime-mode set in backend rank order', () => {
    expect(
      canonicalPromotionModes([
        'auto_execution',
        'report_only',
        'semi_auto',
        'report_only',
      ]),
    ).toEqual(['report_only', 'semi_auto', 'auto_execution']);
    expect(() => canonicalPromotionModes([])).toThrow(TypeError);
  });

  it('requires a valid future absolute expiry', () => {
    const now = Date.parse('2026-07-28T00:00:00Z');
    expect(parsePromotionExpiry('2026-07-29T00:00:00Z', now)).toBe(
      '2026-07-29T00:00:00.000Z',
    );
    expect(() => parsePromotionExpiry('2026-07-27T00:00:00Z', now)).toThrow(
      TypeError,
    );
    expect(() => parsePromotionExpiry('not-a-date', now)).toThrow(TypeError);
  });

  it('derives conservative client eligibility without replacing server gates', () => {
    expect(canCancelFeedbackCycle(cycle('queued', null))).toBe(true);
    expect(canCancelFeedbackCycle(cycle('running', null))).toBe(true);
    expect(canCancelFeedbackCycle(cycle('succeeded', 'candidate_ready'))).toBe(
      false,
    );

    const cancelling = cycle('running', null);
    cancelling.cancel_requested_at = '2026-07-28T00:01:00Z';
    expect(canCancelFeedbackCycle(cancelling)).toBe(false);

    expect(canIssuePromotionPermit(cycle('succeeded', 'candidate_ready'))).toBe(
      true,
    );
    expect(canIssuePromotionPermit(cycle('succeeded', 'promoted'))).toBe(false);
    expect(canIssuePromotionPermit(cycle('running', null))).toBe(false);
  });

  it('rejects a double submit until the exact action is released', () => {
    const pending = new Set<string>();
    expect(tryBeginFeedbackAction(pending, 'cancel:cycle-1')).toBe(true);
    expect(tryBeginFeedbackAction(pending, 'cancel:cycle-1')).toBe(false);
    expect(tryBeginFeedbackAction(pending, 'trigger:crypto')).toBe(true);
    releaseFeedbackAction(pending, 'cancel:cycle-1');
    expect(tryBeginFeedbackAction(pending, 'cancel:cycle-1')).toBe(true);
  });
});
