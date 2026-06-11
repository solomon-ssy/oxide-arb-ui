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
