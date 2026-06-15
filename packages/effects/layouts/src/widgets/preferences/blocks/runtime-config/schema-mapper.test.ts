import type {
  RuntimeConfigDocument,
  RuntimeConfigSchemaFieldView,
} from '@vben/types';

import { describe, expect, it } from 'vitest';

import {
  buildDiffs,
  buildPatch,
  fieldToInputValue,
  getPath,
  groupRuntimeConfigFields,
  inputValueToField,
  normalizeEnumArrayWire,
  normalizeEnumDecimalMapWire,
  sameFieldValue,
} from './schema-mapper';
import { validateGroupDraft } from './schema-validator';
import { fieldStub, uiText } from './test-helpers';

const decimalField = fieldStub({
  default: '100',
  format: 'decimal',
  group: 'risk',
  money_critical: true,
  path: 'risk.max_daily_loss_usd',
  value_type: 'string',
});

const minProfitField = fieldStub({
  default: '0.50',
  format: 'decimal',
  group: 'detection',
  path: 'detection.min_profit_threshold_usd',
  value_type: 'string',
});

const toleranceField = fieldStub({
  default: '1.0',
  format: 'decimal',
  group: 'risk',
  path: 'risk.reconciliation_tolerance_usd',
  value_type: 'string',
});

const nullableAddressField = fieldStub({
  default: null,
  group: 'settlement',
  money_critical: true,
  path: 'settlement.redeem.holder_address',
  value_type: 'string',
});

const tokenField = fieldStub({
  default: '',
  group: 'notification',
  path: 'notification.telegram.bot_token',
  sensitive: true,
  value_type: 'string',
});

describe('runtime-config schema-mapper', () => {
  it('buildPatch omits sensitive unchanged paths', () => {
    const current = {
      notification: { telegram: { bot_token: '***' } },
      risk: { max_daily_loss_usd: '100' },
    } as RuntimeConfigDocument;
    const draft = {
      [decimalField.path]: '150',
      [tokenField.path]: '',
    };
    const diffs = buildDiffs([decimalField, tokenField], current, draft);
    const patch = buildPatch(diffs);
    expect(patch).toEqual({ 'risk.max_daily_loss_usd': '150' });
    expect(patch['notification.telegram.bot_token']).toBeUndefined();
  });

  it('parses decimal wire values as canonical strings', () => {
    expect(inputValueToField(decimalField, '12.50')).toBe('12.5');
    expect(fieldToInputValue(decimalField, '12.50')).toBe('12.5');
  });

  it('treats equivalent decimal formatting as unchanged', () => {
    expect(
      sameFieldValue(
        minProfitField,
        '0.50',
        inputValueToField(minProfitField, '0.50'),
      ),
    ).toBe(true);
    expect(
      sameFieldValue(
        toleranceField,
        '1.0',
        inputValueToField(toleranceField, '1.00'),
      ),
    ).toBe(true);
  });

  it('normalizes enum arrays for stable diffing', () => {
    expect(normalizeEnumArrayWire(['b', 'a', 'a'])).toEqual(['a', 'b']);
  });

  it('normalizes enum decimal maps', () => {
    expect(
      normalizeEnumDecimalMapWire({ crypto: '1.00', sports: '2.50' }),
    ).toEqual({ crypto: '1', sports: '2.5' });
  });

  it('groups fields using server metadata order', () => {
    const groups = groupRuntimeConfigFields({
      groups: [
        {
          id: 'risk',
          label: uiText('Risk'),
          order: 20,
        },
        {
          id: 'detection',
          label: uiText('Detection'),
          order: 10,
        },
      ],
      fields: [
        { ...decimalField, order: 20 },
        { ...minProfitField, order: 10 },
      ],
    });
    expect(groups.map((group) => group.key)).toEqual(['detection', 'risk']);
    expect(groups[0]?.fields[0]?.path).toBe(
      'detection.min_profit_threshold_usd',
    );
  });

  it('reads nested paths from documents', () => {
    expect(
      getPath({ risk: { max_daily_loss_usd: '100' } }, decimalField.path),
    ).toBe('100');
  });

  it('accepts nullable address fields', () => {
    expect(inputValueToField(nullableAddressField, '')).toBeNull();
  });

  it('validates group drafts through the parser', () => {
    const enumField: RuntimeConfigSchemaFieldView = fieldStub({
      constraints: { enum_values: ['dry_run', 'paper', 'live'] },
      default: 'dry_run',
      path: 'execution.mode',
      value_type: 'enum',
    });
    const error = validateGroupDraft(
      [enumField],
      { [enumField.path]: 'not-a-mode' },
      {},
      inputValueToField,
    );
    expect(error).toBeTruthy();
  });
});
