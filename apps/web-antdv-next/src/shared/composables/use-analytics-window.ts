/**
 * UTC analytics window helpers.
 *
 * All analytics endpoints share half-open `[from, to)` UTC boundaries aligned
 * with the report generator — never local-midnight `toISOString()` drift.
 */

import type { Dayjs } from 'dayjs';

import type { AnalyticsQueryParams } from '@vben/types';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/** Maximum analytics window span enforced server-side. */
export const ANALYTICS_MAX_WINDOW_DAYS = 90;

export type AnalyticsWindowPreset = '7d' | '30d' | '90d' | 'custom';

/** Inclusive UTC calendar tuple for RangePicker display. */
export type UtcDayRange = [Dayjs, Dayjs];

/** Build a UTC half-open window ending on the current UTC day. */
export function utcPresetWindow(days: number): UtcDayRange {
  const toExclusive = dayjs.utc().startOf('day').add(1, 'day');
  const fromInclusive = toExclusive.subtract(days, 'day');
  return [fromInclusive, toExclusive.subtract(1, 'millisecond')];
}

/** Serialize a UTC day range for [`AnalyticsQueryParams`]. */
export function toAnalyticsQueryParams(
  range: UtcDayRange,
  executionMode?: AnalyticsQueryParams['execution_mode'],
): AnalyticsQueryParams {
  const [from, to] = range;
  const fromUtc = from.utc().startOf('day');
  const toExclusive = to.utc().startOf('day').add(1, 'day');
  return {
    from: fromUtc.toISOString(),
    to: toExclusive.toISOString(),
    ...(executionMode ? { execution_mode: executionMode } : {}),
  };
}

/** Reject custom spans wider than the server cap. */
export function validateAnalyticsRange(range: UtcDayRange): null | string {
  const [from, to] = range;
  const spanDays =
    to.utc().endOf('day').diff(from.utc().startOf('day'), 'day') + 1;
  if (spanDays > ANALYTICS_MAX_WINDOW_DAYS) {
    return `window too wide (max ${ANALYTICS_MAX_WINDOW_DAYS} days)`;
  }
  if (spanDays < 1) {
    return '`to` must be >= `from`';
  }
  return null;
}

/** Map a preset token to its day count. */
export function presetDays(
  preset: Exclude<AnalyticsWindowPreset, 'custom'>,
): number {
  return Number.parseInt(preset, 10);
}

/** UTC day drill-down window for `/trades` navigation (half-open serialized). */
export function utcDayDrilldownQuery(date: string): {
  execution_mode?: AnalyticsQueryParams['execution_mode'];
  from: string;
  to: string;
} {
  const fromUtc = dayjs.utc(date).startOf('day');
  const toExclusive = fromUtc.add(1, 'day');
  return {
    from: fromUtc.toISOString(),
    to: toExclusive.toISOString(),
  };
}
