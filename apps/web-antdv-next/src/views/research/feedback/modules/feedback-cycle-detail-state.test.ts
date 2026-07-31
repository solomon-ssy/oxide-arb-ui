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
    updated_at: '2026-07-01T00:05:00Z',
  };
}

function detail(): FeedbackCycleDetailView {
  const cycleView = cycle('succeeded', 'no_action');
  return {
    candidate_ready: null,
    coverage: null,
    cycle: cycleView,
    drift_reports: [],
    evaluation_uses: [],
    triggers: [],
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

function candidateReady(): NonNullable<
  FeedbackCycleDetailView['candidate_ready']
> {
  return {
    attribution: {
      decision_counterfactual_count: 4,
      execution_trajectory_count: 3,
      outcome_association_count: 1,
      policy_counterfactual_count: 3,
      prediction_explanation_count: 4,
      prior_cycle_use_count: 2,
      produced_set_hash: 'blake3:produced',
      use_set_hash: 'blake3:uses',
    },
    blockers: [],
    comparison: {
      adjusted_p_value: '0.01',
      confidence: '0.95',
      effect_bps: '12.5',
      observation_count: 120,
      simultaneous_lower_bound_bps: '3.1',
    },
    quality_gate: {
      evaluated_at: '2026-07-01T00:04:00Z',
      gates: [
        {
          class: 'hard',
          detail: 'Exact serving-contract explanation verified.',
          gate: 'explainability_required',
          observed: 'verified',
          status: 'pass',
          threshold: 'verified',
        },
      ],
      intent: 'candidate',
      passed: true,
      report_hash: 'blake3:quality',
    },
    route_diff: {
      candidate_model_version_id: '00000000-0000-0000-0000-000000000102',
      champion_model_version_id: '00000000-0000-0000-0000-000000000101',
      current_route_generation: 4,
      execution_authority_unchanged: true,
      proposed_route_generation: 5,
    },
    shadow: {
      any_hard_divergence: false,
      mean_topn_overlap: '0.9',
      minimum_topn_overlap: '0.8',
      observed: 120,
      observed_window_secs: 259_200,
      required: 100,
      required_window_secs: 259_200,
    },
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

  it('requires a complete scorecard for CandidateReady', () => {
    const snapshot = detail();
    snapshot.cycle = cycle('succeeded', 'candidate_ready');
    expect(() =>
      validateFeedbackCycleDetail(snapshot, snapshot.cycle.feedback_cycle_id),
    ).toThrowError(TypeError);

    snapshot.candidate_ready = candidateReady();
    expect(() =>
      validateFeedbackCycleDetail(snapshot, snapshot.cycle.feedback_cycle_id),
    ).not.toThrow();
  });

  it('rejects a CandidateReady route diff that mutates protected authority', () => {
    const snapshot = detail();
    snapshot.cycle = cycle('succeeded', 'candidate_ready');
    snapshot.candidate_ready = candidateReady();
    snapshot.candidate_ready.route_diff.execution_authority_unchanged = false;
    expect(() =>
      validateFeedbackCycleDetail(snapshot, snapshot.cycle.feedback_cycle_id),
    ).toThrowError(TypeError);
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
