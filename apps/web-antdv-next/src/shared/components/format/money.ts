/**
 * Money / numeric display formatting for oxide-arb.
 *
 * Backend wire format carries all monetary values (`Usd`, `Price`, `Shares`,
 * bps) as `rust_decimal` strings. All parsing here goes through `decimal.js`
 * to preserve exact precision — `number` / `parseFloat` must never be used as
 * an intermediate representation for money.
 */
import Decimal from 'decimal.js';

import { EMPTY_PLACEHOLDER } from './constants';

/** Raw decimal-string input as received from the backend. */
export type DecimalInput = null | string | undefined;

/** Sign classification used by renderers for coloring (positive green / negative red). */
export type DecimalSign = -1 | 0 | 1;

/**
 * Parse a backend decimal string into a `Decimal`.
 * Returns `null` for empty or unparsable input instead of throwing — display
 * code must degrade to the placeholder, never crash a table render.
 */
export function parseDecimal(value: DecimalInput): Decimal | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  try {
    const decimal = new Decimal(value);
    return decimal.isFinite() ? decimal : null;
  } catch {
    return null;
  }
}

/** Insert thousands separators into the integer part of a fixed decimal string. */
function groupThousands(fixed: string): string {
  const [integer = '', fraction] = fixed.split('.');
  const grouped = integer.replaceAll(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${grouped}.${fraction}` : grouped;
}

/**
 * Sign of a decimal string. Returns `null` when the input is empty/invalid so
 * callers can distinguish "no value" from "zero".
 */
export function decimalSign(value: DecimalInput): DecimalSign | null {
  const decimal = parseDecimal(value);
  if (decimal === null) {
    return null;
  }
  if (decimal.isZero()) {
    return 0;
  }
  return decimal.isNegative() ? -1 : 1;
}

/**
 * Format a USD decimal string: `1234.5` → `$1,234.50`, `-12.3` → `-$12.30`.
 * Empty / invalid input renders the placeholder.
 */
export function formatUsd(value: DecimalInput): string {
  const decimal = parseDecimal(value);
  if (decimal === null) {
    return EMPTY_PLACEHOLDER;
  }
  const sign = decimal.isNegative() ? '-' : '';
  return `${sign}$${groupThousands(decimal.abs().toFixed(2))}`;
}

/**
 * Format a price decimal string at fixed 4-decimal precision: `0.985` → `0.9850`.
 * Prices are never colored; empty / invalid input renders the placeholder.
 */
export function formatPrice(value: DecimalInput): string {
  const decimal = parseDecimal(value);
  return decimal === null ? EMPTY_PLACEHOLDER : decimal.toFixed(4);
}

/**
 * Format a shares decimal string with thousands grouping at 2-decimal
 * precision: `12345.5` → `12,345.50`.
 */
export function formatShares(value: DecimalInput): string {
  const decimal = parseDecimal(value);
  return decimal === null
    ? EMPTY_PLACEHOLDER
    : groupThousands(decimal.toFixed(2));
}

/**
 * Format a basis-points value: `450` → `450 bps`. Accepts both numeric and
 * decimal-string input (backend emits bps as integers in most payloads).
 */
export function formatBps(value: DecimalInput | number): string {
  const decimal = parseDecimal(
    typeof value === 'number' ? String(value) : value,
  );
  if (decimal === null) {
    return EMPTY_PLACEHOLDER;
  }
  return `${groupThousands(decimal.toDecimalPlaces(2).toString())} bps`;
}

/**
 * Format a 0–1 ratio decimal string as a percentage: `0.685` → `68.5%`.
 *
 * @param fractionDigits decimal places shown, defaults to 1
 */
export function formatPercent(value: DecimalInput, fractionDigits = 1): string {
  const decimal = parseDecimal(value);
  if (decimal === null) {
    return EMPTY_PLACEHOLDER;
  }
  return `${decimal.mul(100).toFixed(fractionDigits)}%`;
}
