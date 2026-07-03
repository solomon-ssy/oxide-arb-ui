import { describe, expect, it } from 'vitest';

import { isFieldRequired, isFieldVisible } from './field-when';
import { fieldStub, whenIf, whenRequire } from './test-helpers';

describe('isFieldVisible', () => {
  it('is visible when there are no rules', () => {
    const field = fieldStub();
    expect(isFieldVisible(field, {}, {})).toBe(true);
  });

  it('hides the field until every `if` rule matches (eq)', () => {
    const field = fieldStub({
      path: 'execution.auto_execution.min_score',
      when: [whenIf('execution.auto_execution.enabled', true)],
    });
    expect(
      isFieldVisible(
        field,
        {},
        { execution: { auto_execution: { enabled: false } } },
      ),
    ).toBe(false);
    expect(
      isFieldVisible(
        field,
        {},
        { execution: { auto_execution: { enabled: true } } },
      ),
    ).toBe(true);
  });

  it('reads the live draft over the config document', () => {
    const field = fieldStub({
      when: [whenIf('execution.exit_monitor.enabled', true)],
    });
    const draft = { 'execution.exit_monitor.enabled': true };
    expect(isFieldVisible(field, draft, {})).toBe(true);
  });

  it('supports the `ne` operator', () => {
    const field = fieldStub({
      when: [
        { effect: 'if', operator: 'ne', target_path: 'mode', value: 'off' },
      ],
    });
    expect(isFieldVisible(field, { mode: 'off' }, {})).toBe(false);
    expect(isFieldVisible(field, { mode: 'on' }, {})).toBe(true);
  });
});

describe('isFieldRequired', () => {
  it('is required only while a matching `require` rule holds and the field is visible', () => {
    const field = fieldStub({
      when: [whenIf('a', true), whenRequire('a', true)],
    });
    expect(isFieldRequired(field, { a: true }, {})).toBe(true);
    // hidden → never required
    expect(isFieldRequired(field, { a: false }, {})).toBe(false);
  });
});
