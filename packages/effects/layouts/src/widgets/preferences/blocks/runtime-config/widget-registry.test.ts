import type { RuntimeConfigSchemaFieldView } from '@vben/types';

import { describe, expect, it } from 'vitest';

import { fieldStub } from './test-helpers';
import { inferWidget, resolveWidget } from './widget-registry';

describe('widget-registry', () => {
  it('infers decimal_string from format', () => {
    const field = fieldStub({
      format: 'decimal',
      path: 'risk.max_daily_loss_usd',
      value_type: 'string',
    });
    expect(inferWidget(field)).toBe('decimal_string');
  });

  it('prefers explicit server widget hints', () => {
    const field: RuntimeConfigSchemaFieldView = {
      ...fieldStub({
        path: 'market_data.enabled_categories',
        value_type: 'enum_array',
      }),
      widget: 'enum_set',
    };
    expect(resolveWidget(field)).toBe('enum_set');
  });

  it('maps sensitive fields to secret_string', () => {
    const field = fieldStub({
      path: 'notification.telegram.bot_token',
      sensitive: true,
      value_type: 'string',
    });
    expect(inferWidget(field)).toBe('secret_string');
  });
});
