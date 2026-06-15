import { describe, expect, it } from 'vitest';

import {
  evaluateFieldWhen,
  isFieldRequired,
  isFieldVisible,
} from './field-when';
import { fieldStub } from './test-helpers';

describe('field-when', () => {
  it('hides proxy safe address unless route is proxy_safe', () => {
    const field = fieldStub({
      path: 'settlement.redeem.proxy_safe_address',
      value_type: 'string',
      when: [
        {
          effect: 'if',
          operator: 'eq',
          target_path: 'settlement.redeem.route',
          value: 'proxy_safe',
        },
      ],
    });
    const config = {
      settlement: { redeem: { route: 'disabled' } },
    };
    expect(isFieldVisible(field, {}, config)).toBe(false);
    expect(
      isFieldVisible(
        field,
        { 'settlement.redeem.route': 'proxy_safe' },
        config,
      ),
    ).toBe(true);
  });

  it('requires telegram credentials when telegram is enabled', () => {
    const field = fieldStub({
      path: 'notification.telegram.bot_token',
      sensitive: true,
      value_type: 'string',
      when: [
        {
          effect: 'require',
          operator: 'eq',
          target_path: 'notification.telegram.enabled',
          value: true,
        },
      ],
    });
    expect(
      isFieldRequired(field, { 'notification.telegram.enabled': false }, {}),
    ).toBe(false);
    expect(
      isFieldRequired(field, { 'notification.telegram.enabled': true }, {}),
    ).toBe(true);
  });

  it('evaluates in operator rules', () => {
    expect(
      evaluateFieldWhen(
        {
          effect: 'visible',
          operator: 'in',
          target_path: 'execution.mode',
          value: ['paper', 'live'],
        },
        { 'execution.mode': 'live' },
        {},
      ),
    ).toBe(true);
  });
});
