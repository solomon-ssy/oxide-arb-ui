import { describe, expect, it } from 'vitest';

import { inputValueToField } from './schema-mapper';
import { validateGroupDraft } from './schema-validator';
import { fieldStub, uiText, whenIf, whenRequire } from './test-helpers';

describe('validateGroupDraft', () => {
  it('accepts a valid decimal leaf', () => {
    const field = fieldStub({
      format: 'decimal',
      path: 'portfolio.budget.total_budget_usd',
    });
    const error = validateGroupDraft(
      [field],
      { 'portfolio.budget.total_budget_usd': '250' },
      {},
      inputValueToField,
    );
    expect(error).toBe('');
  });

  it('rejects a non-decimal string in a decimal leaf', () => {
    const field = fieldStub({
      format: 'decimal',
      path: 'portfolio.budget.total_budget_usd',
    });
    // The parser throws on unparseable input; the card wraps this in try/catch.
    expect(() =>
      validateGroupDraft(
        [field],
        { 'portfolio.budget.total_budget_usd': 'abc' },
        {},
        inputValueToField,
      ),
    ).toThrow(/decimal string/);
  });

  it('skips hidden fields but enforces required visible fields', () => {
    const hidden = fieldStub({
      path: 'execution.auto_execution.min_score',
      when: [
        whenIf('execution.auto_execution.enabled', true),
        whenRequire('execution.auto_execution.enabled', true),
      ],
    });
    // Hidden (enabled=false) → no error even though empty.
    expect(
      validateGroupDraft(
        [hidden],
        { 'execution.auto_execution.min_score': '' },
        { execution: { auto_execution: { enabled: false } } },
        inputValueToField,
      ),
    ).toBe('');
    // Visible + required + empty → error.
    expect(
      validateGroupDraft(
        [hidden],
        {
          'execution.auto_execution.enabled': true,
          'execution.auto_execution.min_score': '',
        },
        { execution: { auto_execution: { enabled: true } } },
        inputValueToField,
      ),
    ).not.toBe('');
  });

  it('rejects duplicate schedule_id rows', () => {
    const field = fieldStub({
      path: 'reports.schedules',
      value_type: 'array',
      widget: 'schedule_list',
    });
    const error = validateGroupDraft(
      [field],
      {
        'reports.schedules': [
          {
            cadence: { interval_secs: 300, kind: 'interval' },
            enabled: true,
            schedule_id: 'daily',
            knowledge_lag_secs: 10,
            top_n: 20,
          },
          {
            cadence: { interval_secs: 600, kind: 'interval' },
            enabled: true,
            schedule_id: 'daily',
            knowledge_lag_secs: 10,
            top_n: 20,
          },
        ],
      },
      {},
      inputValueToField,
    );
    expect(error).toMatch(/duplicate schedule_id/);
  });

  it('accepts sparse factor weight maps with empty catalog keys', () => {
    const field = fieldStub({
      path: 'factors.factor_weights',
      value_type: 'decimal_map',
      widget: 'weight_map',
      enum_items: [
        { key: 'mean_reversion', label: uiText('Mean reversion') },
        { key: 'momentum', label: uiText('Momentum') },
      ],
    });
    const error = validateGroupDraft(
      [field],
      {
        'factors.factor_weights': {
          mean_reversion: '',
          momentum: '',
        },
      },
      {},
      inputValueToField,
    );
    expect(error).toBe('');
  });
});
