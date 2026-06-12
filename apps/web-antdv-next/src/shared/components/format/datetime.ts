/**
 * Datetime display formatting for oxide-arb.
 *
 * Backend timestamps are RFC3339 strings (UTC, millisecond precision).
 * Tables show the operator's local timezone; the UTC original is exposed via
 * tooltip so audit conversations can reference the canonical wire value.
 */
import { formatDate } from '@vben/utils';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { EMPTY_PLACEHOLDER } from './constants';

dayjs.extend(utc);

const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/**
 * Format an RFC3339 timestamp in the local timezone: `YYYY-MM-DD HH:mm:ss`.
 * Empty / invalid input renders the placeholder.
 */
export function formatDateTimeLocal(value: null | string | undefined): string {
  if (!value) {
    return EMPTY_PLACEHOLDER;
  }
  const formatted = formatDate(value, DATETIME_FORMAT);
  return formatted || EMPTY_PLACEHOLDER;
}

/**
 * Format an RFC3339 timestamp as UTC for tooltips: `YYYY-MM-DD HH:mm:ss UTC`.
 * Empty / invalid input renders the placeholder.
 */
export function formatDateTimeUtc(value: null | string | undefined): string {
  if (!value) {
    return EMPTY_PLACEHOLDER;
  }
  const parsed = dayjs.utc(value);
  return parsed.isValid()
    ? `${parsed.format(DATETIME_FORMAT)} UTC`
    : EMPTY_PLACEHOLDER;
}

/**
 * Format a duration in whole seconds compactly: `93784` → `1d 2h 3m`.
 * Sub-minute durations render as seconds (`42s`).
 */
export function formatDurationSecs(value: null | number | undefined): string {
  if (value === null || value === undefined || value < 0) {
    return EMPTY_PLACEHOLDER;
  }
  const days = Math.floor(value / 86_400);
  const hours = Math.floor((value % 86_400) / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  return parts.length > 0 ? parts.join(' ') : `${Math.floor(value)}s`;
}
