import type {
  DatasetCohortCounts,
  FeedbackCycleDetailView,
  FeedbackCycleView,
  FeedbackDecision,
} from '@vben/types';

export type FeedbackCycleOutcomeState =
  | 'cancelled'
  | 'failed'
  | 'pending'
  | FeedbackDecision;

const knownDecisions = new Set<FeedbackDecision>([
  'candidate_ready',
  'challenger_rejected',
  'no_action',
  'promoted',
]);

const knownStages = new Set([
  'attribution_plan',
  'calibration',
  'comparison',
  'coverage',
  'cpcv',
  'dataset_seal',
  'decision',
  'drift',
  'shadow',
  'training',
  'trigger',
  'truth_freeze',
  'validation',
]);

const knownEventKinds = new Set([
  'cancellation_requested',
  'cancelled',
  'failed',
  'job_linked',
  'lease_recovered',
  'started',
  'succeeded',
  'triggered',
]);

const driftKindsByMetric = new Map([
  ['jensen_shannon_divergence', 'label'],
  ['kolmogorov_smirnov_p_value', 'data'],
  ['population_stability_index', 'data'],
  ['rank_ic_drop', 'concept'],
]);

const knownDriftAssessments = new Set([
  'insufficient_evidence',
  'threshold_exceeded',
  'within_threshold',
]);

function assertCount(value: number, field: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${field} must be a non-negative safe integer`);
  }
}

function validateCohort(counts: DatasetCohortCounts, field: string) {
  assertCount(counts.candidate_count, `${field}.candidate_count`);
  assertCount(counts.eligible_count, `${field}.eligible_count`);
  assertCount(counts.included_count, `${field}.included_count`);
  for (const entry of counts.exclusion_counts) {
    assertCount(entry.count, `${field}.exclusion_counts.count`);
  }
  for (const entry of counts.censor_counts) {
    assertCount(entry.count, `${field}.censor_counts.count`);
  }
}

/**
 * Validate and project the closed cycle terminal vocabulary. Invalid
 * status/decision combinations never degrade into a generic display state.
 */
export function feedbackCycleOutcomeState(
  cycle: FeedbackCycleView,
): FeedbackCycleOutcomeState {
  if (cycle.status === 'succeeded') {
    if (cycle.decision === null || !knownDecisions.has(cycle.decision)) {
      throw new TypeError('succeeded feedback cycle requires a known decision');
    }
    return cycle.decision;
  }
  if (cycle.decision !== null) {
    throw new TypeError('non-succeeded feedback cycle cannot carry a decision');
  }

  switch (cycle.status) {
    case 'cancelled': {
      return 'cancelled';
    }
    case 'failed': {
      return 'failed';
    }
    case 'queued':
    case 'running': {
      return 'pending';
    }
    default: {
      throw new TypeError('feedback cycle status is unknown');
    }
  }
}

/**
 * Fail closed when a detail snapshot crosses cycle identity, ordering, or
 * JavaScript integer-safety boundaries.
 */
export function validateFeedbackCycleDetail(
  detail: FeedbackCycleDetailView,
  expectedCycleId: string,
) {
  if (detail.cycle.feedback_cycle_id !== expectedCycleId) {
    throw new TypeError('feedback cycle detail identity does not match');
  }
  assertCount(detail.cycle.generation, 'cycle.generation');
  feedbackCycleOutcomeState(detail.cycle);

  let previousSequence = 0;
  for (const event of detail.timeline) {
    if (event.feedback_cycle_id !== expectedCycleId) {
      throw new TypeError('feedback timeline crossed cycle identity');
    }
    assertCount(event.event_sequence, 'timeline.event_sequence');
    if (event.event_sequence === 0) {
      throw new TypeError('feedback timeline sequence must be positive');
    }
    if (event.event_sequence <= previousSequence) {
      throw new TypeError('feedback timeline is not strictly ordered');
    }
    if (
      !knownStages.has(event.stage) ||
      !knownEventKinds.has(event.event_kind)
    ) {
      throw new TypeError('feedback timeline contains unknown vocabulary');
    }
    previousSequence = event.event_sequence;
  }

  let previousTriggerTime = '';
  for (const trigger of detail.triggers) {
    if (trigger.feedback_cycle_id !== expectedCycleId) {
      throw new TypeError('feedback trigger provenance crossed cycle identity');
    }
    if (
      trigger.trigger_family !== 'manual' &&
      trigger.trigger_family !== 'scheduled'
    ) {
      throw new TypeError('feedback trigger provenance has unknown family');
    }
    if (
      trigger.occurred_at < previousTriggerTime ||
      trigger.reason_code.length === 0
    ) {
      throw new TypeError('feedback trigger provenance is not canonical');
    }
    previousTriggerTime = trigger.occurred_at;
  }

  for (const report of detail.drift_reports) {
    if (report.feedback_cycle_id !== expectedCycleId) {
      throw new TypeError('feedback drift report crossed cycle identity');
    }
    assertCount(report.sample_count, 'drift_report.sample_count');
    if (
      driftKindsByMetric.get(report.metric) !== report.kind ||
      !knownDriftAssessments.has(report.assessment)
    ) {
      throw new TypeError('feedback drift report contains unknown vocabulary');
    }
  }
  for (const evaluationUse of detail.evaluation_uses) {
    if (evaluationUse.feedback_cycle_id !== expectedCycleId) {
      throw new TypeError('feedback evaluation use crossed cycle identity');
    }
    if (
      evaluationUse.purpose !== 'promotion_comparison' ||
      evaluationUse.dataset_purpose !== 'evaluation'
    ) {
      throw new TypeError('feedback evaluation use has invalid purpose');
    }
  }

  const coverage = detail.coverage;
  if (coverage !== null) {
    if (coverage.decision !== 'advance' && coverage.decision !== 'no_action') {
      throw new TypeError('feedback coverage decision is unknown');
    }
    assertCount(
      coverage.policy_evaluation_count,
      'coverage.policy_evaluation_count',
    );
    assertCount(coverage.mature_label_count, 'coverage.mature_label_count');
    assertCount(
      coverage.new_mature_label_count,
      'coverage.new_mature_label_count',
    );
    assertCount(
      coverage.minimum_mature_labels,
      'coverage.minimum_mature_labels',
    );
    assertCount(
      coverage.minimum_new_mature_labels,
      'coverage.minimum_new_mature_labels',
    );
    validateCohort(coverage.model_learning, 'coverage.model_learning');
    validateCohort(coverage.execution_learning, 'coverage.execution_learning');
    validateCohort(coverage.policy_evaluation, 'coverage.policy_evaluation');
  }

  const candidateReady = detail.candidate_ready;
  if (detail.cycle.decision === 'candidate_ready') {
    if (candidateReady === null) {
      throw new TypeError(
        'candidate-ready cycle requires a decision scorecard',
      );
    }
    assertCount(
      candidateReady.comparison.observation_count,
      'candidate_ready.comparison.observation_count',
    );
    assertCount(
      candidateReady.shadow.observed,
      'candidate_ready.shadow.observed',
    );
    assertCount(
      candidateReady.shadow.required,
      'candidate_ready.shadow.required',
    );
    assertCount(
      candidateReady.shadow.observed_window_secs,
      'candidate_ready.shadow.observed_window_secs',
    );
    assertCount(
      candidateReady.shadow.required_window_secs,
      'candidate_ready.shadow.required_window_secs',
    );
    assertCount(
      candidateReady.route_diff.current_route_generation,
      'candidate_ready.route_diff.current_route_generation',
    );
    assertCount(
      candidateReady.route_diff.proposed_route_generation,
      'candidate_ready.route_diff.proposed_route_generation',
    );
    if (
      candidateReady.route_diff.proposed_route_generation !==
        candidateReady.route_diff.current_route_generation + 1 ||
      !candidateReady.route_diff.execution_authority_unchanged ||
      !candidateReady.quality_gate.passed ||
      candidateReady.blockers.length > 0
    ) {
      throw new TypeError('candidate-ready decision evidence is inconsistent');
    }
    for (const field of [
      'prior_cycle_use_count',
      'prediction_explanation_count',
      'decision_counterfactual_count',
      'outcome_association_count',
      'execution_trajectory_count',
      'policy_counterfactual_count',
    ] as const) {
      assertCount(
        candidateReady.attribution[field],
        `candidate_ready.attribution.${field}`,
      );
    }
  } else if (candidateReady !== null) {
    throw new TypeError('non-candidate-ready cycle cannot carry a scorecard');
  }
}
