import type { FeatureParityRunView } from '@vben/types';

import { FACTOR_VALUE_STATES, FEATURE_CELL_STATES } from '@vben/types';

import { describe, expect, it } from 'vitest';

import {
  findTagOption,
  useFeatureCellStateTagOptions,
  useModelInputStateTagOptions,
} from '#/shared/components/format/tag-options';

import {
  canClearFeatureParityLatch,
  canRunFullFeatureParity,
  featureIntegrityRunIdFromQuery,
  featureIntegrityRunRoute,
} from './feature-integrity-actions';

const passedFullRun: FeatureParityRunView = {
  acting_role: 'risk_owner',
  compared_count: 20,
  created_at: '2026-07-10T10:00:00.000Z',
  feature_contract_hash: `blake3:${'a'.repeat(64)}`,
  finished_at: '2026-07-10T10:06:00.000Z',
  kind: 'full',
  matched_count: 20,
  mismatched_count: 0,
  parity_run_id: '01900000-0000-7000-8000-000000000001',
  pending_materialization_count: 0,
  reason: 'recovery verification',
  status: 'passed',
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

describe('feature-integrity deep links', () => {
  it('normalizes router query values and uses one encoded run route', () => {
    expect(featureIntegrityRunIdFromQuery('run-id')).toBe('run-id');
    expect(featureIntegrityRunIdFromQuery(['first', 'second'])).toBe('first');
    expect(featureIntegrityRunIdFromQuery('')).toBeUndefined();
    expect(featureIntegrityRunIdFromQuery(undefined)).toBeUndefined();
    expect(featureIntegrityRunRoute('run/id with space')).toBe(
      '/research/feature-integrity?run_id=run%2Fid%20with%20space',
    );
  });
});

describe('feature-integrity governed action state', () => {
  it('offers full parity only with permission, a loaded summary, and initialized state', () => {
    expect(
      canRunFullFeatureParity({
        hasPermission: true,
        latch: { open: false },
        summaryAvailable: true,
        summaryLoading: false,
      }),
    ).toBe(true);
    expect(
      canRunFullFeatureParity({
        hasPermission: false,
        latch: { open: false },
        summaryAvailable: true,
        summaryLoading: false,
      }),
    ).toBe(false);
    expect(
      canRunFullFeatureParity({
        hasPermission: true,
        latch: { blocking_run_id: null, open: true, opened_at: null },
        summaryAvailable: true,
        summaryLoading: false,
      }),
    ).toBe(false);
    expect(
      canRunFullFeatureParity({
        hasPermission: true,
        latch: null,
        summaryAvailable: true,
        summaryLoading: false,
      }),
    ).toBe(false);
    expect(
      canRunFullFeatureParity({
        hasPermission: true,
        latch: { open: false },
        summaryAvailable: false,
        summaryLoading: false,
      }),
    ).toBe(false);
    expect(
      canRunFullFeatureParity({
        hasPermission: true,
        latch: { open: false },
        summaryAvailable: true,
        summaryLoading: true,
      }),
    ).toBe(false);
  });

  it('offers latch recovery only to an authorized actor with a qualified proof', () => {
    expect(canClearFeatureParityLatch(true, openLatch, passedFullRun)).toBe(
      true,
    );
    expect(canClearFeatureParityLatch(false, openLatch, passedFullRun)).toBe(
      false,
    );
    expect(
      canClearFeatureParityLatch(true, openLatch, {
        ...passedFullRun,
        status: 'mismatched',
      }),
    ).toBe(false);
  });
});

describe('feature-integrity evidence presentation', () => {
  it.each([
    [FEATURE_CELL_STATES.missing, 'error'],
    [FEATURE_CELL_STATES.notApplicable, 'default'],
    [FEATURE_CELL_STATES.observed, 'success'],
    [FEATURE_CELL_STATES.substituted, 'warning'],
  ] as const)('presents FeatureCell %s with %s severity', (state, color) => {
    expect(findTagOption(useFeatureCellStateTagOptions(), state)?.color).toBe(
      color,
    );
  });

  it.each([
    [FACTOR_VALUE_STATES.indeterminate, 'warning'],
    [FACTOR_VALUE_STATES.missingInput, 'error'],
    [FACTOR_VALUE_STATES.notApplicable, 'default'],
    [FACTOR_VALUE_STATES.scored, 'success'],
  ] as const)('presents factor input %s with %s severity', (state, color) => {
    expect(findTagOption(useModelInputStateTagOptions(), state)?.color).toBe(
      color,
    );
  });

  it('keeps an unsupported evidence state visible as contract drift', () => {
    expect(
      findTagOption(useModelInputStateTagOptions(), 'unsupported_state'),
    ).toMatchObject({
      color: 'error',
      value: 'unsupported_state',
    });
  });
});
