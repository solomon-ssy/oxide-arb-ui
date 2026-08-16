import type { FeedbackCycleView, PromotionPermitView } from '@vben/types';

import { describe, expect, it } from 'vitest';

import {
  canCancelFeedbackCycle,
  canIssuePromotionPermit,
  promotionPermitRemaining,
  promotionPermitStatus,
  promotionRouteGenerationDiff,
  releaseFeedbackAction,
  tryBeginFeedbackAction,
  validateFeedbackReason,
  validatePermitTtl,
} from './feedback-action-state';

function permit(): PromotionPermitView {
  return {
    allowed_runtime_modes: ['report_only'],
    candidate_manifest_hash: 'blake3:manifest',
    candidate_manifest_id: 'manifest-1',
    candidate_model_version_id: 'candidate-1',
    category: 'crypto',
    champion_model_version_id: 'champion-1',
    champion_serving_contract_hash: 'blake3:champion',
    expected_decision_policy_snapshot_id: 'snapshot-1',
    expected_policy_generation: 3,
    expected_runtime_control_revision: 4,
    expected_snapshot_hash: 'blake3:snapshot',
    expected_route_generation: 8,
    expires_at: '2026-07-28T00:30:00Z',
    feedback_cycle_id: 'cycle-1',
    idempotency_key: 'idempotency-1',
    issuance_hash: 'blake3:issuance',
    issuance_reason: 'operator_authorized',
    issued_at: '2026-07-28T00:00:00Z',
    issued_by_role: 'super_admin',
    issued_by_user_id: 'user-1',
    issued_by_username: 'admin',
    non_route_policy_hash: 'blake3:non-route',
    observed_at: '2026-07-28T00:10:00Z',
    preflight_hash: 'blake3:preflight',
    profile_ref: {
      content_hash: 'blake3:profile',
      id: 'crypto',
      version: 1,
    },
    promotion_gate_hash: 'blake3:gate',
    promotion_permit_id: 'permit-1',
    research_profile_artifact_id: 'profile-artifact-1',
    revision: 0,
    revoked_at: null,
    revoked_by_role: null,
    revoked_by_user_id: null,
    revoked_by_username: null,
    revocation_reason: null,
    scope_hash: 'blake3:scope',
    serving_constraints_hash: 'blake3:constraints',
    status: 'active',
    updated_at: '2026-07-28T00:00:00Z',
  };
}

function cycle(
  status: FeedbackCycleView['status'],
  decision: FeedbackCycleView['decision'],
): FeedbackCycleView {
  return {
    feedback_cycle_id: 'cycle-1',
    idempotency_hash: 'blake3:idempotency',
    profile_ref: {
      content_hash: 'blake3:profile',
      id: 'crypto',
      version: 1,
    },
    research_profile_artifact_id: 'profile-artifact-1',
    feedback_policy_hash: 'blake3:policy',
    label_cutoff: '2026-07-28T00:00:00Z',
    champion_model_version_id: 'model-version-1',
    champion_serving_contract_hash: 'blake3:serving',
    champion_model_spec_id: 'model-spec-1',
    champion_model_spec_definition_hash: 'blake3:model-spec',
    champion_model_family: 'classical_logistic_regression',
    route: 'crypto',
    decision_policy_snapshot_id: 'snapshot-1',
    decision_policy_snapshot_hash: 'blake3:snapshot',
    policy_bundle_generation: 3,
    route_generation: 3,
    evaluation_mode: 'conditional',
    parent_cycle_id: null,
    forced_idempotency_key: null,
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

  it('accepts only governed permit TTL presets', () => {
    for (const ttl of [300, 900, 1800, 3600]) {
      expect(validatePermitTtl(ttl)).toBe(ttl);
    }
    expect(() => validatePermitTtl(299)).toThrow(TypeError);
    expect(() => validatePermitTtl(901)).toThrow(TypeError);
  });

  it('presents the bound route generation instead of policy generation', () => {
    expect(promotionRouteGenerationDiff(permit())).toBe('8 → 9');
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

  it('uses server time plus monotonic elapsed time for permit expiry', () => {
    const active = permit();
    expect(promotionPermitRemaining(active, 1000, 1000)).toBe(1200);
    expect(promotionPermitRemaining(active, 1000, 61_000)).toBe(1140);
    expect(promotionPermitStatus(active, 1000, 1_201_000)).toBe('expired');

    active.status = 'revoked';
    expect(promotionPermitStatus(active, 1000, 1000)).toBe('revoked');
  });

  it('fails closed for malformed permit clock evidence', () => {
    const malformed = permit();
    malformed.observed_at = 'not-a-timestamp';
    expect(promotionPermitRemaining(malformed, 1000, 1000)).toBeNull();
    expect(promotionPermitStatus(malformed, 1000, 1000)).toBe('invalid');

    malformed.observed_at = '2026-07-28T00:40:00Z';
    expect(promotionPermitStatus(malformed, 1000, 1000)).toBe('invalid');
  });
});
