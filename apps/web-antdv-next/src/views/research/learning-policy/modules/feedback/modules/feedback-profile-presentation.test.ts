import type {
  DatasetCohortCounts,
  FeedbackProfileOverviewView,
  FeedbackReadinessView,
} from '@vben/types';

import { describe, expect, it } from 'vitest';

import { feedbackProfilePresentation } from './feedback-profile-presentation';

const emptyCohortCounts: DatasetCohortCounts = {
  candidate_count: 0,
  censor_counts: [],
  eligible_count: 0,
  exclusion_counts: [],
  included_count: 0,
};

function cryptoProfile(): FeedbackProfileOverviewView {
  return {
    activation_eligibility: 'research_only',
    category: 'crypto',
    evaluation_window_days: 90,
    feedback_cadence_secs: 21_600,
    feedback_policy_hash: 'blake3:crypto-policy',
    latest_coverage: {
      artifact_hash: 'blake3:crypto-coverage',
      artifact_id: 'feedback-coverage:crypto',
      artifact_uri: 's3://feedback/crypto.json',
      coverage: '0.987654321098765432',
      decision: 'advance',
      evaluation_window_start: '2026-04-01T00:00:00Z',
      execution_learning: emptyCohortCounts,
      label_cutoff: '2026-07-01T00:00:00Z',
      mature_label_count: 240,
      minimum_coverage: '0.900000000000000001',
      minimum_mature_labels: 200,
      minimum_new_mature_labels: 50,
      model_learning: emptyCohortCounts,
      new_mature_label_count: 64,
      policy_evaluation: emptyCohortCounts,
      policy_evaluation_count: 240,
      reason_code: null,
    },
    latest_cycle: {
      cancel_requested_at: null,
      champion_model_version_id: '00000000-0000-0000-0000-000000000101',
      champion_serving_contract_hash: 'blake3:crypto-champion',
      completed_at: '2026-07-01T00:05:00Z',
      created_at: '2026-07-01T00:00:00Z',
      decision: 'candidate_ready',
      feedback_cycle_id: '00000000-0000-0000-0000-000000000201',
      feedback_policy_hash: 'blake3:crypto-policy',
      generation: 3,
      idempotency_hash: 'blake3:crypto-idempotency',
      label_cutoff: '2026-07-01T00:00:00Z',
      lease_expires_at: null,
      champion_model_family: 'classical_logistic_regression',
      champion_model_spec_definition_hash: 'blake3:model-spec',
      champion_model_spec_id: '00000000-0000-0000-0000-000000000301',
      route: 'crypto',
      route_generation: 4,
      policy_bundle_generation: 4,
      decision_policy_snapshot_hash: 'blake3:policy-snapshot',
      decision_policy_snapshot_id: '00000000-0000-0000-0000-000000000401',
      evaluation_mode: 'conditional',
      parent_cycle_id: null,
      forced_idempotency_key: null,
      profile_ref: {
        content_hash: 'blake3:crypto-profile',
        id: 'crypto_price_15m',
        version: 2,
      },
      research_profile_artifact_id:
        'rpa:crypto_price_15m:2:blake3:crypto-profile',
      started_at: '2026-07-01T00:01:00Z',
      status: 'succeeded',
      terminal_reason_code: null,
      updated_at: '2026-07-01T00:05:00Z',
    },
    minimum_coverage: '0.900000000000000001',
    minimum_mature_labels: 200,
    minimum_new_mature_labels: 50,
    profile_ref: {
      content_hash: 'blake3:crypto-profile',
      id: 'crypto_price_15m',
      version: 2,
    },
    retraining_cooldown_secs: 259_200,
  };
}

function weatherProfile(): FeedbackProfileOverviewView {
  return {
    activation_eligibility: 'semi_auto_candidate',
    category: 'weather',
    evaluation_window_days: 90,
    feedback_cadence_secs: 86_400,
    feedback_policy_hash: 'blake3:weather-policy',
    latest_coverage: null,
    latest_cycle: null,
    minimum_coverage: '0.950000000000000000',
    minimum_mature_labels: 200,
    minimum_new_mature_labels: 50,
    profile_ref: {
      content_hash: 'blake3:weather-profile',
      id: 'weather_forecast_24h',
      version: 3,
    },
    retraining_cooldown_secs: 1_209_600,
  };
}

describe('feedback profile presentation', () => {
  it('projects Crypto ready coverage and champion without decimal coercion', () => {
    const readiness: FeedbackReadinessView = {
      latency_ready: true,
      observed_at: '2026-07-01T00:00:00Z',
      observed_history_days: 365,
      required_history_days: 180,
      retention_ready: true,
    };

    expect(feedbackProfilePresentation(cryptoProfile(), readiness)).toEqual(
      expect.objectContaining({
        championModelVersionId: '00000000-0000-0000-0000-000000000101',
        championServingContractHash: 'blake3:crypto-champion',
        coverage: '0.987654321098765432',
        coverageState: 'advance',
        latestCycleStatus: 'succeeded',
        minimumCoverage: '0.900000000000000001',
        observedHistoryDays: 365,
        readinessState: 'ready',
      }),
    );
  });

  it('keeps Weather blocked and no-cycle facts distinct', () => {
    const readiness: FeedbackReadinessView = {
      latency_ready: true,
      observed_at: '2026-07-01T00:00:00Z',
      observed_history_days: 30,
      required_history_days: 180,
      retention_ready: false,
    };

    expect(feedbackProfilePresentation(weatherProfile(), readiness)).toEqual(
      expect.objectContaining({
        championModelVersionId: null,
        coverage: null,
        coverageState: 'not_observed',
        latestCycleStatus: null,
        observedHistoryDays: 30,
        readinessState: 'blocked',
      }),
    );
  });

  it('preserves null observed history instead of synthesizing zero', () => {
    const readiness: FeedbackReadinessView = {
      latency_ready: false,
      observed_at: '2026-07-01T00:00:00Z',
      observed_history_days: null,
      required_history_days: 180,
      retention_ready: false,
    };

    expect(feedbackProfilePresentation(weatherProfile(), readiness)).toEqual(
      expect.objectContaining({
        observedHistoryDays: null,
        readinessState: 'not_observed',
      }),
    );
  });
});
