import { describe, expect, it } from 'vitest';

import { resolveUiText, resolveUiTextLines } from './ui-text';

describe('resolveUiText', () => {
  it('prefers the requested locale', () => {
    expect(
      resolveUiText(
        {
          kind: 'localized',
          locales: { 'en-US': 'Risk', 'zh-CN': '风控' },
        },
        'zh-CN',
      ),
    ).toBe('风控');
  });

  it('falls back through en-US and zh-CN', () => {
    expect(
      resolveUiText(
        {
          kind: 'localized',
          locales: { 'en-US': 'Risk' },
        },
        'fr-FR',
      ),
    ).toBe('Risk');
  });

  it('returns simple values unchanged', () => {
    expect(resolveUiText({ kind: 'simple', value: 'fallback' }, 'en-US')).toBe(
      'fallback',
    );
  });

  it('splits help text into lines', () => {
    expect(
      resolveUiTextLines(
        {
          kind: 'localized',
          locales: { 'en-US': 'Line one\nLine two' },
        },
        'en-US',
      ),
    ).toEqual(['Line one', 'Line two']);
  });
});
