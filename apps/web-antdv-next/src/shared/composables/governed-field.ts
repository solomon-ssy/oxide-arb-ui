/**
 * Typed governed-modal field primitives, kept dependency-light (only
 * `decimal.js`) so the pure {@link isGovernedFieldValid} validator is unit
 * testable without dragging in the modal component's UI deps.
 */
import Decimal from 'decimal.js';

/** Input widget kind for a {@link GovernedField}. */
export type GovernedFieldKind = 'price' | 'select' | 'shares' | 'text' | 'usd';

/** Option for a `select`-kind {@link GovernedField}. */
export interface GovernedFieldOption {
  label: string;
  value: string;
}

/**
 * A typed operator input rendered inside the governed modal, above the reason
 * field. Decimal kinds (`shares` / `price` / `usd`) validate through
 * `decimal.js`; `required` blocks submit until satisfied. Values surface on the
 * governed context's `fields` map keyed by `name`.
 */
export interface GovernedField {
  name: string;
  label: string;
  kind: GovernedFieldKind;
  required?: boolean;
  /** Options for `select` kind. */
  options?: GovernedFieldOption[];
  placeholder?: string;
  help?: string;
}

/** Decimal-input kinds validate through `decimal.js` (never `parseFloat`). */
const DECIMAL_FIELD_KINDS = new Set<GovernedFieldKind>([
  'price',
  'shares',
  'usd',
]);

/**
 * Whether a governed field's raw input is acceptable for submission.
 *
 * - An empty value is valid iff the field is not `required`.
 * - Decimal kinds (`shares` / `price` / `usd`) must parse to a finite, strictly
 *   positive `Decimal` — no float intermediate.
 * - Other kinds accept any non-empty string.
 */
export function isGovernedFieldValid(
  field: GovernedField,
  rawValue: string | undefined,
): boolean {
  const raw = (rawValue ?? '').trim();
  if (raw === '') {
    return !field.required;
  }
  if (!DECIMAL_FIELD_KINDS.has(field.kind)) {
    return true;
  }
  try {
    const decimal = new Decimal(raw);
    return decimal.isFinite() && decimal.greaterThan(0);
  } catch {
    return false;
  }
}
