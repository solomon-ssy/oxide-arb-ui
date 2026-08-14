import type {
  DecimalString,
  FeedbackCoverageDecision,
  FeedbackCycleStatus,
  FeedbackDecision,
  FeedbackProfileOverviewView,
  FeedbackReadinessView,
  MarketCategory,
  ResearchEvaluationTrack,
} from '@vben/types';

export type FeedbackProfileReadinessState =
  | 'blocked'
  | 'not_observed'
  | 'ready';

export type FeedbackProfileCoverageState =
  | 'not_observed'
  | FeedbackCoverageDecision;

export interface FeedbackProfilePresentation {
  activationEligibility: ResearchEvaluationTrack;
  category: MarketCategory | null;
  championModelVersionId: null | string;
  championServingContractHash: null | string;
  coverage: DecimalString | null;
  coverageReasonCode: null | string;
  coverageState: FeedbackProfileCoverageState;
  evaluationWindowDays: number;
  feedbackCadenceSecs: number;
  feedbackPolicyHash: string;
  latestCycleId: null | string;
  latestCycleStatus: FeedbackCycleStatus | null;
  latestDecision: FeedbackDecision | null;
  latestUpdatedAt: null | string;
  latencyReady: boolean | null;
  matureLabelCount: null | number;
  minimumCoverage: DecimalString;
  minimumMatureLabels: number;
  minimumNewMatureLabels: number;
  newMatureLabelCount: null | number;
  observedAt: null | string;
  observedHistoryDays: null | number;
  profileContentHash: string;
  profileId: string;
  profileVersion: number;
  readinessState: FeedbackProfileReadinessState;
  requiredHistoryDays: null | number;
  retentionReady: boolean | null;
  retrainingCooldownSecs: number;
}

function readinessState(
  readiness: FeedbackReadinessView | null,
): FeedbackProfileReadinessState {
  if (readiness?.observed_history_days === null) {
    return 'not_observed';
  }
  if (
    readiness === null ||
    !readiness.retention_ready ||
    !readiness.latency_ready
  ) {
    return 'blocked';
  }
  return 'ready';
}

/**
 * Project one server-owned profile overview into bounded display facts.
 * Decimal strings and nullable evidence deliberately remain unmodified.
 */
export function feedbackProfilePresentation(
  profile: FeedbackProfileOverviewView,
  readiness: FeedbackReadinessView | null,
): FeedbackProfilePresentation {
  const cycle = profile.latest_cycle;
  const coverage = profile.latest_coverage;

  return {
    activationEligibility: profile.activation_eligibility,
    category: profile.category,
    championModelVersionId: cycle?.champion_model_version_id ?? null,
    championServingContractHash: cycle?.champion_serving_contract_hash ?? null,
    coverage: coverage?.coverage ?? null,
    coverageReasonCode: coverage?.reason_code ?? null,
    coverageState: coverage?.decision ?? 'not_observed',
    evaluationWindowDays: profile.evaluation_window_days,
    feedbackCadenceSecs: profile.feedback_cadence_secs,
    feedbackPolicyHash: profile.feedback_policy_hash,
    latestCycleId: cycle?.feedback_cycle_id ?? null,
    latestCycleStatus: cycle?.status ?? null,
    latestDecision: cycle?.decision ?? null,
    latestUpdatedAt: cycle?.updated_at ?? null,
    latencyReady: readiness?.latency_ready ?? null,
    matureLabelCount: coverage?.mature_label_count ?? null,
    minimumCoverage: profile.minimum_coverage,
    minimumMatureLabels: profile.minimum_mature_labels,
    minimumNewMatureLabels: profile.minimum_new_mature_labels,
    newMatureLabelCount: coverage?.new_mature_label_count ?? null,
    observedAt: readiness?.observed_at ?? null,
    observedHistoryDays: readiness?.observed_history_days ?? null,
    profileContentHash: profile.profile_ref.content_hash,
    profileId: profile.profile_ref.id,
    profileVersion: profile.profile_ref.version,
    readinessState: readinessState(readiness),
    requiredHistoryDays: readiness?.required_history_days ?? null,
    retentionReady: readiness?.retention_ready ?? null,
    retrainingCooldownSecs: profile.retraining_cooldown_secs,
  };
}
