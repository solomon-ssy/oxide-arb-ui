import { describe, expect, it } from 'vitest';

import {
  relativeTimeLabel,
  shouldShowPointSymbols,
  timeTickInterval,
  trimEmptyEdgePoints,
} from './metrics';

describe('trimEmptyEdgePoints', () => {
  it('removes empty edge buckets without collapsing internal gaps', () => {
    expect(
      trimEmptyEdgePoints([
        [1, null],
        [2, null],
        [3, 0.5],
        [4, null],
        [5, 0.6],
        [6, null],
      ]),
    ).toEqual([
      [3, 0.5],
      [4, null],
      [5, 0.6],
    ]);
  });

  it('returns no chart points when every bucket is empty', () => {
    expect(
      trimEmptyEdgePoints([
        [1, null],
        [2, null],
      ]),
    ).toEqual([]);
  });

  it('shows symbols when valid samples cannot form a progressing line', () => {
    expect(
      shouldShowPointSymbols([
        [1, 0.5],
        [1, 0.5],
      ]),
    ).toBe(true);
    expect(
      shouldShowPointSymbols([
        [1, 0.5],
        [2, null],
        [3, 0.5],
      ]),
    ).toBe(true);
    expect(
      shouldShowPointSymbols([
        [1, null],
        [2, null],
      ]),
    ).toBe(false);
  });

  it('uses a line when adjacent samples advance through time', () => {
    expect(
      shouldShowPointSymbols([
        [1, 0.5],
        [2, 0.5],
      ]),
    ).toBe(false);
  });

  it('uses fixed tick intervals for every supported horizon', () => {
    expect(timeTickInterval(5 * 60_000)).toBe(60_000);
    expect(timeTickInterval(60 * 60_000)).toBe(10 * 60_000);
    expect(timeTickInterval(6 * 60 * 60_000)).toBe(60 * 60_000);
    expect(timeTickInterval(24 * 60 * 60_000)).toBe(4 * 60 * 60_000);
    expect(timeTickInterval(3 * 24 * 60 * 60_000)).toBe(12 * 60 * 60_000);
  });

  it('formats axis positions relative to the authoritative live head', () => {
    const anchor = 1_800_000_000_000;
    expect(relativeTimeLabel(anchor, anchor)).toBe('0');
    expect(relativeTimeLabel(anchor - 45_000, anchor)).toBe('−45s');
    expect(relativeTimeLabel(anchor - 10 * 60_000, anchor)).toBe('−10m');
    expect(relativeTimeLabel(anchor - 6 * 60 * 60_000, anchor)).toBe('−6h');
    expect(relativeTimeLabel(anchor - 2 * 86_400_000, anchor)).toBe('−2d');
  });
});
