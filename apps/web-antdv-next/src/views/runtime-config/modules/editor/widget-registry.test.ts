import { describe, expect, it } from 'vitest';

import { fieldStub } from './test-helpers';
import { inferWidget, resolveWidget } from './widget-registry';

describe('inferWidget', () => {
  it('prefers the secret widget for sensitive fields', () => {
    expect(inferWidget(fieldStub({ sensitive: true }))).toBe('secret_string');
  });

  it('maps value types / formats to widgets', () => {
    expect(inferWidget(fieldStub({ value_type: 'boolean' }))).toBe('boolean');
    expect(inferWidget(fieldStub({ value_type: 'enum' }))).toBe('enum_select');
    expect(inferWidget(fieldStub({ value_type: 'enum_array' }))).toBe(
      'enum_set',
    );
    expect(inferWidget(fieldStub({ value_type: 'string_array' }))).toBe(
      'string_list',
    );
    expect(
      inferWidget(fieldStub({ format: 'decimal', value_type: 'string' })),
    ).toBe('decimal_string');
    expect(
      inferWidget(fieldStub({ format: 'duration_ms', value_type: 'number' })),
    ).toBe('duration_ms');
    expect(inferWidget(fieldStub({ value_type: 'number' }))).toBe('integer');
    expect(inferWidget(fieldStub({ value_type: 'object' }))).toBe('json_tree');
  });
});

describe('resolveWidget', () => {
  it('honors an explicit server widget hint', () => {
    expect(
      resolveWidget(fieldStub({ value_type: 'string', widget: 'enum_select' })),
    ).toBe('enum_select');
  });
});
