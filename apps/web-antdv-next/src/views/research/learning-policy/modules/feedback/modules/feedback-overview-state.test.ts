import type { FeedbackOverviewView } from '@vben/types';

import { describe, expect, it } from 'vitest';

import { validateFeedbackOverview } from './feedback-overview-state';

function overview(): FeedbackOverviewView {
  return {
    generated_at: '2026-07-30T02:00:01.000Z',
    profiles: [],
    queue: {
      oldest_queued_at: null,
      oldest_running_at: null,
      pending_outbox: 0,
      queued: 0,
      running: 0,
    },
    readiness: {
      latency_ready: true,
      observed_at: '2026-07-30T02:00:00.000Z',
      observed_history_days: 365,
      required_history_days: 180,
      retention_ready: true,
    },
    revision: 42,
    truth_operations: {
      execution_attempt_sealed_through: '2026-07-30T02:00:00.000Z',
      execution_attempt_unsealed_count: 0,
      observed_at: '2026-07-30T02:00:00.000Z',
      recommendation_rollup_sealed_through: '2026-07-30T02:00:00.000Z',
      recommendation_rollup_unsealed_count: 0,
      resolution_attention: [],
      resolution_excluded_count: 0,
      resolution_mapping_blocked_count: 0,
      resolution_oldest_unresolved_at: null,
      resolution_quarantined_count: 0,
      resolution_terminal_through: '2026-07-30T02:00:00.000Z',
      resolution_unresolved_count: 0,
    },
  };
}

describe('feedback overview authority', () => {
  it('accepts a coherent PostgreSQL snapshot interval', () => {
    expect(() => validateFeedbackOverview(overview(), 41)).not.toThrow();
  });

  it('rejects revision regressions and unsafe counters', () => {
    const regressed = overview();
    expect(() => validateFeedbackOverview(regressed, 43)).toThrow(
      'revision regressed',
    );

    const unsafe = overview();
    unsafe.queue.pending_outbox = Number.MAX_SAFE_INTEGER + 1;
    expect(() => validateFeedbackOverview(unsafe, 0)).toThrow(
      'non-negative safe integer',
    );
  });

  it('rejects contradictory queue and resolution evidence', () => {
    const missingOldest = overview();
    missingOldest.queue.queued = 1;
    expect(() => validateFeedbackOverview(missingOldest, 0)).toThrow(
      'inconsistent with its backlog count',
    );

    const impossibleQuarantine = overview();
    impossibleQuarantine.truth_operations.resolution_quarantined_count = 1;
    expect(() => validateFeedbackOverview(impossibleQuarantine, 0)).toThrow(
      'quarantine cannot exceed unresolved',
    );
  });

  it('rejects a healthy count paired with a stale frontier', () => {
    const stale = overview();
    stale.truth_operations.execution_attempt_sealed_through =
      '2026-07-30T01:59:59.000Z';
    expect(() => validateFeedbackOverview(stale, 0)).toThrow(
      'contradicts its backlog count',
    );
  });

  it('accepts lag only when the frontier remains behind the cutoff', () => {
    const lagging = overview();
    lagging.truth_operations.recommendation_rollup_unsealed_count = 2;
    lagging.truth_operations.recommendation_rollup_sealed_through =
      '2026-07-30T01:59:00.000Z';
    expect(() => validateFeedbackOverview(lagging, 0)).not.toThrow();

    lagging.truth_operations.recommendation_rollup_sealed_through =
      '2026-07-30T02:00:01.000Z';
    expect(() => validateFeedbackOverview(lagging, 0)).toThrow(
      'contradicts its backlog count',
    );
  });

  it('rejects malformed and future-dated authority evidence', () => {
    const malformed = overview();
    malformed.truth_operations.observed_at = 'not-a-time';
    expect(() => validateFeedbackOverview(malformed, 0)).toThrow(
      'valid timestamp',
    );

    const future = overview();
    if (future.readiness === null) {
      throw new TypeError('test fixture must include readiness');
    }
    future.readiness.observed_at = '2026-07-30T02:00:02.000Z';
    expect(() => validateFeedbackOverview(future, 0)).toThrow(
      'cannot be later than snapshot',
    );
  });
});
