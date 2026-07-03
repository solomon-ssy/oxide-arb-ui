import type { GovernedField } from './governed-field';

import { describe, expect, it } from 'vitest';

import { isGovernedFieldValid } from './governed-field';

function field(overrides: Partial<GovernedField> = {}): GovernedField {
  return {
    kind: 'text',
    label: 'Field',
    name: 'field',
    ...overrides,
  };
}

describe('isGovernedFieldValid', () => {
  it('accepts empty optional fields and rejects empty required fields', () => {
    expect(isGovernedFieldValid(field(), '')).toBe(true);
    expect(isGovernedFieldValid(field(), undefined)).toBe(true);
    expect(isGovernedFieldValid(field({ required: true }), '')).toBe(false);
    expect(isGovernedFieldValid(field({ required: true }), '  ')).toBe(false);
    expect(isGovernedFieldValid(field({ required: true }), 'ok')).toBe(true);
  });

  it('accepts any non-empty value for text / select kinds', () => {
    expect(isGovernedFieldValid(field({ kind: 'select' }), 'filled')).toBe(
      true,
    );
    expect(isGovernedFieldValid(field({ kind: 'text' }), 'note')).toBe(true);
  });

  it('requires strictly positive finite decimals for money kinds', () => {
    for (const kind of ['shares', 'price', 'usd'] as const) {
      expect(isGovernedFieldValid(field({ kind }), '12.5')).toBe(true);
      expect(isGovernedFieldValid(field({ kind }), '0')).toBe(false);
      expect(isGovernedFieldValid(field({ kind }), '-1')).toBe(false);
      expect(isGovernedFieldValid(field({ kind }), 'abc')).toBe(false);
      // Empty is still allowed when optional.
      expect(isGovernedFieldValid(field({ kind }), '')).toBe(true);
    }
  });
});
