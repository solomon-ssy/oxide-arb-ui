import type {
  FeedbackCycleDetailView,
  FeedbackCycleStatus,
  FeedbackCycleView,
  FeedbackDecision,
} from '@vben/types';

import { describe, expect, it } from 'vitest';

import {
  feedbackCycleOutcomeState,
  validateFeedbackCycleDetail,
} from './feedback-cycle-detail-state';

function cycle(
  status: FeedbackCycleStatus,
  decision: FeedbackDecision | null,
): FeedbackCycleView {
  return {
    cancel_requested_at: status === 'cancelled' ? '2026-07-01T00:02:00Z' : null,
    candidate_family: {},
    candidate_family_hash: 'blake3:candidate-family',
    capability_registry_hashes: ['blake3:capability'],
    champion_model_version_id: '00000000-0000-0000-0000-000000000101',
    champion_serving_contract_hash: 'blake3:champion',
    completed_at:
      status === 'queued' || status === 'running'
        ? null
        : '2026-07-01T00:05:00Z',
    created_at: '2026-07-01T00:00:00Z',
    decision,
    feedback_cycle_id: '00000000-0000-0000-0000-000000000201',
    feedback_policy_hash: 'blake3:policy',
    generation: 3,
    idempotency_hash: 'blake3:idempotency',
    label_cutoff: '2026-07-01T00:00:00Z',
    lease_expires_at: status === 'running' ? '2026-07-01T00:04:00Z' : null,
    profile_ref: {
      content_hash: 'blake3:profile',
      id: 'crypto_price_15m',
      version: 2,
    },
    research_profile_artifact_id: 'rpa:crypto_price_15m:2:blake3:profile',
    started_at: status === 'queued' ? null : '2026-07-01T00:01:00Z',
    status,
    terminal_reason_code:
      status === 'failed' || status === 'cancelled'
        ? `feedback_${status}`
        : null,
    trigger_family: 'scheduled',
    updated_at: '2026-07-01T00:05:00Z',
  };
}

function detail(): FeedbackCycleDetailView {
  const cycleView = cycle('succeeded', 'no_action');
  return {
    coverage: null,
    cycle: cycleView,
    drift_reports: [],
    evaluation_uses: [],
    timeline: [
      {
        actor: 'feedback-scheduler',
        created_at: '2026-07-01T00:00:00Z',
        event_hash: 'blake3:event-0',
        event_kind: 'triggered',
        event_sequence: 1,
        evidence_hash: null,
        evidence_uri: null,
        feedback_cycle_id: cycleView.feedback_cycle_id,
        feedback_stage_event_id: '00000000-0000-0000-0000-000000000301',
        occurred_at: '2026-07-01T00:00:00Z',
        reason_code: null,
        research_job_id: null,
        stage: 'trigger',
      },
      {
        actor: 'feedback-worker',
        created_at: '2026-07-01T00:01:00Z',
        event_hash: 'blake3:event-1',
        event_kind: 'succeeded',
        event_sequence: 2,
        evidence_hash: 'blake3:coverage',
        evidence_uri: 's3://feedback/coverage.json',
        feedback_cycle_id: cycleView.feedback_cycle_id,
        feedback_stage_event_id: '00000000-0000-0000-0000-000000000302',
        occurred_at: '2026-07-01T00:01:00Z',
        reason_code: null,
        research_job_id: '00000000-0000-0000-0000-000000000401',
        stage: 'coverage',
      },
    ],
  };
}

describe('feedback cycle detail state', () => {
  it.each([
    ['no_action', 'no_action'],
    ['challenger_rejected', 'challenger_rejected'],
    ['candidate_ready', 'candidate_ready'],
    ['promoted', 'promoted'],
  ] as const)('projects succeeded decision %s', (decision, expected) => {
    expect(feedbackCycleOutcomeState(cycle('succeeded', decision))).toBe(
      expected,
    );
  });

  it.each([
    ['failed', 'failed'],
    ['cancelled', 'cancelled'],
  ] as const)(
    'keeps %s distinct from business decisions',
    (status, expected) => {
      expect(feedbackCycleOutcomeState(cycle(status, null))).toBe(expected);
    },
  );

  it.each(['queued', 'running'] as const)(
    'keeps non-terminal %s pending',
    (status) => {
      expect(feedbackCycleOutcomeState(cycle(status, null))).toBe('pending');
    },
  );

  it('rejects a succeeded cycle without a decision', () => {
    expect(() =>
      feedbackCycleOutcomeState(cycle('succeeded', null)),
    ).toThrowError(TypeError);
  });

  it('rejects a non-succeeded cycle carrying a decision', () => {
    expect(() =>
      feedbackCycleOutcomeState(cycle('failed', 'promoted')),
    ).toThrowError(TypeError);
  });

  it('accepts one identity-consistent ordered detail snapshot', () => {
    const snapshot = detail();
    expect(() =>
      validateFeedbackCycleDetail(snapshot, snapshot.cycle.feedback_cycle_id),
    ).not.toThrow();
  });

  it('rejects a detail response for another cycle', () => {
    expect(() =>
      validateFeedbackCycleDetail(
        detail(),
        '00000000-0000-0000-0000-000000000999',
      ),
    ).toThrowError(TypeError);
  });

  it('rejects timeline sequence regression instead of sorting it', () => {
    const snapshot = detail();
    const [, secondEvent] = snapshot.timeline;
    if (secondEvent === undefined) {
      throw new TypeError('detail fixture requires a second timeline event');
    }
    secondEvent.event_sequence = 1;
    expect(() =>
      validateFeedbackCycleDetail(snapshot, snapshot.cycle.feedback_cycle_id),
    ).toThrowError(TypeError);
  });

  it('rejects a zero timeline sequence', () => {
    const snapshot = detail();
    const [firstEvent] = snapshot.timeline;
    if (firstEvent === undefined) {
      throw new TypeError('detail fixture requires a first timeline event');
    }
    firstEvent.event_sequence = 0;
    expect(() =>
      validateFeedbackCycleDetail(snapshot, snapshot.cycle.feedback_cycle_id),
    ).toThrowError(TypeError);
  });
});
