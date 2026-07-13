import { describe, expect, it } from 'vitest';

import {
  isCompletePassedFullRun,
  isRecoveryEligible,
  isUninitializedLatch,
  recoveryRunCandidates,
  recoveryRunScope,
} from './recovery-eligibility';

const passedFullRun = {
  acting_role: 'risk_owner',
  compared_count: 20,
  created_at: '2026-07-10T10:00:00.000Z',
  feature_contract_hash: `blake3:${'a'.repeat(64)}`,
  finished_at: '2026-07-10T10:05:00.001Z',
  kind: 'full' as const,
  matched_count: 20,
  mismatched_count: 0,
  parity_run_id: '01900000-0000-7000-8000-000000000001',
  pending_materialization_count: 0,
  reason: 'recovery verification',
  status: 'passed' as const,
  total_count: 20,
  transform_hash: `blake3:${'b'.repeat(64)}`,
  triggered_by: 'operator',
  window_end: '2026-07-10T10:00:00.000Z',
  window_start: '2026-07-09T10:00:00.000Z',
};

const openLatch = {
  blocking_run_id: '01900000-0000-7000-8000-000000000000',
  open: true,
  opened_at: '2026-07-10T10:05:00.000Z',
};

describe('isRecoveryEligible', () => {
  it('accepts a passed full run finished strictly after latch opening', () => {
    expect(isRecoveryEligible(openLatch, passedFullRun)).toBe(true);
  });

  it('rejects equal timestamps instead of weakening the recovery boundary', () => {
    expect(
      isRecoveryEligible(openLatch, {
        ...passedFullRun,
        finished_at: openLatch.opened_at,
      }),
    ).toBe(false);
  });

  it('rejects malformed timestamps and non-full runs', () => {
    expect(
      isRecoveryEligible({ ...openLatch, opened_at: 'invalid' }, passedFullRun),
    ).toBe(false);
    expect(
      isRecoveryEligible(openLatch, { ...passedFullRun, kind: 'sampled' }),
    ).toBe(false);
    expect(
      isRecoveryEligible({ ...openLatch, open: false }, passedFullRun),
    ).toBe(false);
  });

  it('accepts an exact model/dataset proof for an uninitialized latch', () => {
    const uninitializedLatch = {
      blocking_run_id: null,
      open: true,
      opened_at: null,
    };
    const frozenProof = {
      ...passedFullRun,
      model_version_id: '01900000-0000-7000-8000-000000000010',
      training_dataset_id: '01900000-0000-7000-8000-000000000011',
    };

    expect(isUninitializedLatch(uninitializedLatch)).toBe(true);
    expect(recoveryRunScope(frozenProof)).toBe('frozen_model_dataset');
    expect(isRecoveryEligible(uninitializedLatch, frozenProof)).toBe(true);
  });

  it('does not offer unbound serving evidence for bootstrap acknowledgement', () => {
    const uninitializedLatch = {
      blocking_run_id: null,
      open: true,
      opened_at: null,
    };

    expect(recoveryRunScope(passedFullRun)).toBe('serving_runtime');
    expect(isRecoveryEligible(uninitializedLatch, passedFullRun)).toBe(false);
  });

  it('rejects a malformed persisted-open latch without its causal run', () => {
    expect(
      isRecoveryEligible(
        { ...openLatch, blocking_run_id: null },
        passedFullRun,
      ),
    ).toBe(false);
  });

  it('rejects incomplete or malformed recovery proofs before acknowledgement', () => {
    expect(
      isCompletePassedFullRun({ ...passedFullRun, transform_hash: null }),
    ).toBe(false);
    expect(
      isCompletePassedFullRun({ ...passedFullRun, feature_contract_hash: '' }),
    ).toBe(false);
    expect(
      isCompletePassedFullRun({ ...passedFullRun, matched_count: 19 }),
    ).toBe(false);
    expect(
      isCompletePassedFullRun({ ...passedFullRun, total_count: 20.5 }),
    ).toBe(false);
    expect(
      isCompletePassedFullRun({
        ...passedFullRun,
        model_version_id: '01900000-0000-7000-8000-000000000010',
      }),
    ).toBe(false);
  });

  it('classifies an unbound full replay as serving runtime evidence', () => {
    expect(recoveryRunScope(passedFullRun)).toBe('serving_runtime');
  });

  it('returns eligible candidates newest-first without auto-selecting one', () => {
    const older = {
      ...passedFullRun,
      finished_at: '2026-07-10T10:05:00.001Z',
      parity_run_id: '01900000-0000-7000-8000-000000000001',
    };
    const newer = {
      ...passedFullRun,
      finished_at: '2026-07-10T10:06:00.001Z',
      parity_run_id: '01900000-0000-7000-8000-000000000002',
    };

    expect(recoveryRunCandidates(openLatch, [older, newer])).toEqual([
      newer,
      older,
    ]);
  });
});
