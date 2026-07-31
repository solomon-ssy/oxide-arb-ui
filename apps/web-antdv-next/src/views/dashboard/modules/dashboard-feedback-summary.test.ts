import type {
  FeedbackOverviewView,
  FeedbackProfileOverviewView,
} from '@vben/types';

import { describe, expect, it } from 'vitest';

import {
  isFeedbackSnapshotCurrent,
  summarizeDashboardFeedback,
} from './dashboard-feedback-summary';

function profile(
  id: string,
  category: FeedbackProfileOverviewView['category'],
): FeedbackProfileOverviewView {
  return {
    activation_eligibility: 'research_only',
    category,
    evaluation_window_days: 90,
    feedback_cadence_secs: 21_600,
    feedback_policy_hash: `blake3:${id}-policy`,
    latest_coverage: null,
    latest_cycle:
      category === 'crypto'
        ? {
            cancel_requested_at: null,
            candidate_family: {},
            candidate_family_hash: 'blake3:crypto-family',
            capability_registry_hashes: ['blake3:crypto-capability'],
            champion_model_version_id: '00000000-0000-0000-0000-000000000101',
            champion_serving_contract_hash: 'blake3:crypto-champion',
            completed_at: '2026-07-29T03:05:00.000Z',
            created_at: '2026-07-29T03:00:00.000Z',
            decision: 'candidate_ready',
            feedback_cycle_id: '00000000-0000-0000-0000-000000000201',
            feedback_policy_hash: 'blake3:crypto-policy',
            generation: 3,
            idempotency_hash: 'blake3:crypto-idempotency',
            label_cutoff: '2026-07-29T03:00:00.000Z',
            lease_expires_at: null,
            profile_ref: {
              content_hash: 'blake3:crypto-profile',
              id,
              version: 2,
            },
            research_profile_artifact_id:
              'rpa:crypto_price_15m:2:blake3:crypto-profile',
            started_at: '2026-07-29T03:01:00.000Z',
            status: 'succeeded',
            terminal_reason_code: null,
            updated_at: '2026-07-29T03:05:00.000Z',
          }
        : null,
    minimum_coverage: '0.900000000000000001',
    minimum_mature_labels: 200,
    minimum_new_mature_labels: 50,
    profile_ref: {
      content_hash: `blake3:${id}-profile`,
      id,
      version: 2,
    },
    retraining_cooldown_secs: 259_200,
  };
}

function overview(): FeedbackOverviewView {
  return {
    generated_at: '2026-07-29T03:10:00.000Z',
    profiles: [
      profile('pooled_control', null),
      profile('crypto_price_15m', 'crypto'),
      profile('weather_forecast_24h', 'weather'),
    ],
    queue: {
      oldest_queued_at: null,
      oldest_running_at: null,
      pending_outbox: 0,
      queued: 0,
      running: 0,
    },
    truth_operations: {
      execution_attempt_sealed_through: '2026-07-29T03:10:00.000Z',
      execution_attempt_unsealed_count: 0,
      observed_at: '2026-07-29T03:10:00.000Z',
      recommendation_rollup_sealed_through: '2026-07-29T03:10:00.000Z',
      recommendation_rollup_unsealed_count: 0,
      resolution_oldest_unresolved_at: null,
      resolution_quarantined_count: 0,
      resolution_unresolved_count: 0,
      resolution_verified_through: '2026-07-29T03:10:00.000Z',
    },
    readiness: {
      latency_ready: true,
      observed_at: '2026-07-29T03:10:00.000Z',
      observed_history_days: 365,
      required_history_days: 180,
      retention_ready: true,
    },
    revision: 42,
  };
}

describe('dashboard feedback summary', () => {
  it('keeps API order, excludes control profiles, and projects latest feedback', () => {
    const summary = summarizeDashboardFeedback(overview());

    expect(summary.profiles.map((item) => item.profileId)).toEqual([
      'crypto_price_15m',
      'weather_forecast_24h',
    ]);
    expect(summary.profiles[0]).toEqual(
      expect.objectContaining({
        championServingContractHash: 'blake3:crypto-champion',
        latestCycleId: '00000000-0000-0000-0000-000000000201',
        latestCycleStatus: 'succeeded',
        latestDecision: 'candidate_ready',
        readinessState: 'ready',
      }),
    );
    expect(summary.profiles[1]).toEqual(
      expect.objectContaining({
        latestCycleId: null,
        latestCycleStatus: null,
        readinessState: 'ready',
      }),
    );
  });

  it('keeps missing readiness blocked without synthesizing history or decimals', () => {
    const snapshot = overview();
    snapshot.readiness = null;
    const summary = summarizeDashboardFeedback(snapshot);

    expect(summary.profiles[0]).toEqual(
      expect.objectContaining({
        minimumCoverage: '0.900000000000000001',
        observedHistoryDays: null,
        readinessState: 'blocked',
      }),
    );
  });

  it('accepts only safe, non-regressing authoritative revisions', () => {
    expect(isFeedbackSnapshotCurrent(overview(), 42)).toBe(true);
    expect(isFeedbackSnapshotCurrent(overview(), 43)).toBe(false);
    expect(isFeedbackSnapshotCurrent({ ...overview(), revision: 1.5 }, 0)).toBe(
      false,
    );
  });
});
