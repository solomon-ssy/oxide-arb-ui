import type { FeatureParityRunView } from '@vben/types';

import { FEATURE_PARITY_STAGES } from '@vben/types';

import { describe, expect, it } from 'vitest';

import { enumOption, enumOptions } from '#/shared/presentation/enum-options';

import { buildParityRunTrend } from './parity-run-trend';

function run(
  overrides: Partial<FeatureParityRunView> = {},
): FeatureParityRunView {
  return {
    acting_role: 'system',
    compared_count: 20,
    created_at: '2026-07-10T10:00:00.000Z',
    feature_contract_hash: `blake3:${'a'.repeat(64)}`,
    kind: 'sampled',
    matched_count: 20,
    mismatched_count: 0,
    parity_run_id: '01900000-0000-7000-8000-000000000001',
    pending_materialization_count: 0,
    reason: 'scheduled replay',
    status: 'passed',
    total_count: 20,
    triggered_by: 'scheduler',
    window_end: '2026-07-10T10:00:00.000Z',
    window_start: '2026-07-10T09:00:00.000Z',
    ...overrides,
  };
}

describe('buildParityRunTrend', () => {
  it('sorts real sampled and full run facts without changing their counts', () => {
    const laterFull = run({
      compared_count: 200,
      created_at: '2026-07-10T12:00:00.000Z',
      kind: 'full',
      mismatched_count: 2,
      parity_run_id: '01900000-0000-7000-8000-000000000002',
      pending_materialization_count: 3,
      status: 'mismatched',
    });
    const earlierSampled = run();

    expect(buildParityRunTrend([laterFull, earlierSampled])).toEqual({
      points: [
        {
          comparedCount: 20,
          createdAt: Date.parse(earlierSampled.created_at),
          kind: 'sampled',
          mismatchedCount: 0,
          parityRunId: earlierSampled.parity_run_id,
          pendingCount: 0,
          status: 'passed',
        },
        {
          comparedCount: 200,
          createdAt: Date.parse(laterFull.created_at),
          kind: 'full',
          mismatchedCount: 2,
          parityRunId: laterFull.parity_run_id,
          pendingCount: 3,
          status: 'mismatched',
        },
      ],
      rejectedCount: 0,
    });
  });

  it('rejects malformed timestamps and counts instead of plotting zeroes', () => {
    const valid = run();
    const malformedTime = run({
      created_at: 'not-a-time',
      parity_run_id: '01900000-0000-7000-8000-000000000002',
    });
    const malformedCount = run({
      mismatched_count: -1,
      parity_run_id: '01900000-0000-7000-8000-000000000003',
    });

    expect(buildParityRunTrend([malformedTime, malformedCount, valid])).toEqual(
      {
        points: [
          {
            comparedCount: 20,
            createdAt: Date.parse(valid.created_at),
            kind: 'sampled',
            mismatchedCount: 0,
            parityRunId: valid.parity_run_id,
            pendingCount: 0,
            status: 'passed',
          },
        ],
        rejectedCount: 2,
      },
    );
  });

  it.each(Object.values(FEATURE_PARITY_STAGES))(
    'keeps stage %s visible in drill-down from a trend point',
    (stage) => {
      const option = enumOption(enumOptions('FeatureParityStage'), stage);
      expect(option).toBeDefined();
      expect(option?.label).toBeTruthy();
    },
  );

  it('keeps an unsupported stage visible as contract drift', () => {
    expect(
      enumOption(enumOptions('FeatureParityStage'), 'unsupported_stage'),
    ).toMatchObject({
      color: 'error',
      value: 'unsupported_stage',
    });
  });
});
