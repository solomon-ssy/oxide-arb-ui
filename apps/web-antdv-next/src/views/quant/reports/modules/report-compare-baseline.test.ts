import type { CompareOption } from './report-compare-baseline';

import { RECOMMENDATION_REPORT_STATUSES } from '@vben/types';

import { describe, expect, it } from 'vitest';

import { defaultBaseline } from './report-compare-baseline';

function option(id: string, asOf: string): CompareOption {
  return {
    as_of: asOf,
    label: `${asOf} · ${id}`,
    status: RECOMMENDATION_REPORT_STATUSES.published,
    value: id,
  };
}

// Options are always newest-first by as_of (the composable sorts before use).
const NEWEST_FIRST = [
  option('r3', '2026-07-03T00:00:00.000Z'),
  option('r2', '2026-07-02T00:00:00.000Z'),
  option('r1', '2026-07-01T00:00:00.000Z'),
];

describe('defaultBaseline', () => {
  it('returns undefined when there is nothing to compare against', () => {
    expect(defaultBaseline([], '2026-07-03T00:00:00.000Z')).toBeUndefined();
  });

  it('picks the most recent report strictly older than the current one', () => {
    // Current report is r3 (2026-07-03); the previous run is r2.
    expect(defaultBaseline(NEWEST_FIRST, '2026-07-03T00:00:00.000Z')).toBe(
      'r2',
    );
  });

  it('picks the previous run even when current is the middle report', () => {
    expect(defaultBaseline(NEWEST_FIRST, '2026-07-02T00:00:00.000Z')).toBe(
      'r1',
    );
  });

  it('falls back to the newest option when none are older', () => {
    // Current is older than every option → no strictly-older baseline exists.
    expect(defaultBaseline(NEWEST_FIRST, '2026-06-01T00:00:00.000Z')).toBe(
      'r3',
    );
  });
});
