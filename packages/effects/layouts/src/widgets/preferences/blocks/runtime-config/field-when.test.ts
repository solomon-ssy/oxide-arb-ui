import { describe, expect, it } from 'vitest';

import {
  evaluateFieldWhen,
  isFieldRequired,
  isFieldVisible,
} from './field-when';
import { fieldStub } from './test-helpers';

describe('field-when', () => {
  it('hides a field until the target value is active', () => {
    const field = fieldStub({
      path: 'notification.telegram.chat_id',
      value_type: 'string',
      when: [
        {
          effect: 'if',
          operator: 'eq',
          target_path: 'notification.telegram.enabled',
          value: true,
        },
      ],
    });
    const config = {
      notification: { telegram: { enabled: false } },
    };
    expect(isFieldVisible(field, {}, config)).toBe(false);
    expect(
      isFieldVisible(field, { 'notification.telegram.enabled': true }, config),
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
