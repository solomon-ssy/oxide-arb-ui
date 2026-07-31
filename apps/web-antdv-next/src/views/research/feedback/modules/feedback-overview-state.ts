import type { FeedbackOverviewView, IsoDateTime } from '@vben/types';

function assertCounter(value: number, field: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${field} must be a non-negative safe integer`);
  }
}

function timestamp(value: IsoDateTime, field: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new TypeError(`${field} must be a valid timestamp`);
  }
  return parsed;
}

function assertOldest(
  count: number,
  value: IsoDateTime | null,
  field: string,
  observedAt: number,
) {
  if ((count === 0) !== (value === null)) {
    throw new TypeError(`${field} is inconsistent with its backlog count`);
  }
  if (value !== null && timestamp(value, field) > observedAt) {
    throw new TypeError(`${field} cannot be later than the observation time`);
  }
}

function assertFrontier(
  count: number,
  value: IsoDateTime,
  field: string,
  observedAt: number,
  generatedAt: number,
) {
  const frontier = timestamp(value, field);
  if (frontier > generatedAt) {
    throw new TypeError(`${field} cannot be later than the snapshot`);
  }
  if (
    (count === 0 && frontier < observedAt) ||
    (count > 0 && frontier > observedAt)
  ) {
    throw new TypeError(`${field} contradicts its backlog count`);
  }
  return frontier;
}

/**
 * Reject internally contradictory operator evidence before it can be rendered
 * as a healthy zero or used to authorize a governed action.
 */
export function validateFeedbackOverview(
  snapshot: FeedbackOverviewView,
  minimumRevision: number,
) {
  assertCounter(snapshot.revision, 'revision');
  assertCounter(minimumRevision, 'minimumRevision');
  if (snapshot.revision < minimumRevision) {
    throw new TypeError('feedback overview revision regressed');
  }

  const generatedAt = timestamp(snapshot.generated_at, 'generated_at');
  const truth = snapshot.truth_operations;
  const observedAt = timestamp(
    truth.observed_at,
    'truth_operations.observed_at',
  );
  if (observedAt > generatedAt) {
    throw new TypeError('truth observation cannot be later than the snapshot');
  }

  assertCounter(snapshot.queue.queued, 'queue.queued');
  assertCounter(snapshot.queue.running, 'queue.running');
  assertCounter(snapshot.queue.pending_outbox, 'queue.pending_outbox');
  assertOldest(
    snapshot.queue.queued,
    snapshot.queue.oldest_queued_at,
    'queue.oldest_queued_at',
    generatedAt,
  );
  assertOldest(
    snapshot.queue.running,
    snapshot.queue.oldest_running_at,
    'queue.oldest_running_at',
    generatedAt,
  );

  assertCounter(
    truth.resolution_unresolved_count,
    'truth_operations.resolution_unresolved_count',
  );
  assertCounter(
    truth.resolution_quarantined_count,
    'truth_operations.resolution_quarantined_count',
  );
  assertCounter(
    truth.execution_attempt_unsealed_count,
    'truth_operations.execution_attempt_unsealed_count',
  );
  assertCounter(
    truth.recommendation_rollup_unsealed_count,
    'truth_operations.recommendation_rollup_unsealed_count',
  );
  if (truth.resolution_quarantined_count > truth.resolution_unresolved_count) {
    throw new TypeError('resolution quarantine cannot exceed unresolved truth');
  }

  assertOldest(
    truth.resolution_unresolved_count,
    truth.resolution_oldest_unresolved_at,
    'truth_operations.resolution_oldest_unresolved_at',
    observedAt,
  );
  const resolutionFrontier = assertFrontier(
    truth.resolution_unresolved_count,
    truth.resolution_verified_through,
    'truth_operations.resolution_verified_through',
    observedAt,
    generatedAt,
  );
  if (
    truth.resolution_oldest_unresolved_at !== null &&
    resolutionFrontier >
      timestamp(
        truth.resolution_oldest_unresolved_at,
        'truth_operations.resolution_oldest_unresolved_at',
      )
  ) {
    throw new TypeError('resolution frontier passed unresolved truth');
  }
  assertFrontier(
    truth.execution_attempt_unsealed_count,
    truth.execution_attempt_sealed_through,
    'truth_operations.execution_attempt_sealed_through',
    observedAt,
    generatedAt,
  );
  assertFrontier(
    truth.recommendation_rollup_unsealed_count,
    truth.recommendation_rollup_sealed_through,
    'truth_operations.recommendation_rollup_sealed_through',
    observedAt,
    generatedAt,
  );

  if (snapshot.readiness !== null) {
    assertCounter(
      snapshot.readiness.required_history_days,
      'readiness.required_history_days',
    );
    if (snapshot.readiness.observed_history_days !== null) {
      assertCounter(
        snapshot.readiness.observed_history_days,
        'readiness.observed_history_days',
      );
    }
    if (
      timestamp(snapshot.readiness.observed_at, 'readiness.observed_at') >
      generatedAt
    ) {
      throw new TypeError(
        'readiness observation cannot be later than snapshot',
      );
    }
  }
}
