import { describe, expect, it } from 'vitest';

import { inputValueToField } from './schema-mapper';
import { fieldZodSchema, validateGroupDraft } from './schema-validator';
import { fieldStub } from './test-helpers';

const decimalField = fieldStub({
  constraints: { minimum: 1, maximum: 1000 },
  default: '100',
  format: 'decimal',
  group: 'risk',
  money_critical: true,
  path: 'risk.max_daily_loss_usd',
  value_type: 'string',
});

const enumField = fieldStub({
  constraints: { enum_values: ['dry_run', 'paper', 'live'] },
  default: 'dry_run',
  group: 'execution',
  path: 'execution.mode',
  value_type: 'enum',
});

describe('runtime-config schema-validator', () => {
  it('accepts valid decimal strings', () => {
    expect(fieldZodSchema(decimalField).safeParse('12.5').success).toBe(true);
  });

  it('rejects invalid decimal strings', () => {
    expect(fieldZodSchema(decimalField).safeParse('not-a-number').success).toBe(
      false,
    );
  });

  it('accepts enum wire values', () => {
    expect(fieldZodSchema(enumField).safeParse('paper').success).toBe(true);
    expect(fieldZodSchema(enumField).safeParse('invalid').success).toBe(false);
  });

  it('validates min/max on number fields', () => {
    const numberField = fieldStub({
      constraints: { minimum: 1, maximum: 10 },
      default: 5,
      format: 'integer',
      group: 'execution',
      path: 'execution.retries',
      value_type: 'number',
    });
    expect(fieldZodSchema(numberField).safeParse(5).success).toBe(true);
    expect(fieldZodSchema(numberField).safeParse(0).success).toBe(false);
    expect(fieldZodSchema(numberField).safeParse(11).success).toBe(false);
  });

  it('returns the first group validation error', () => {
    const error = validateGroupDraft(
      [enumField],
      { [enumField.path]: 'not-a-mode' },
      {},
      inputValueToField,
    );
    expect(error).toBeTruthy();
  });
});
