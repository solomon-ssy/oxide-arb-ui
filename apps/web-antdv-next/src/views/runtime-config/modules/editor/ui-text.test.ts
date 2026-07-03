import { describe, expect, it } from 'vitest';

import { uiText } from './test-helpers';
import { resolveUiText, resolveUiTextLines } from './ui-text';

describe('resolveUiText', () => {
  it('returns the requested locale', () => {
    expect(resolveUiText(uiText('Budget', '预算'), 'zh-CN')).toBe('预算');
    expect(resolveUiText(uiText('Budget', '预算'), 'en-US')).toBe('Budget');
  });

  it('falls back to en-US then zh-CN then first entry', () => {
    expect(resolveUiText(uiText('Budget', '预算'), 'fr-FR')).toBe('Budget');
    expect(resolveUiText({ locales: { 'zh-CN': '预算' } }, 'en-US')).toBe(
      '预算',
    );
    expect(resolveUiText({ locales: { 'de-DE': 'X' } }, 'en-US')).toBe('X');
  });

  it('returns empty string for missing text', () => {
    expect(resolveUiText(undefined, 'en-US')).toBe('');
    expect(resolveUiText({ locales: {} }, 'en-US')).toBe('');
  });
});

describe('resolveUiTextLines', () => {
  it('splits multi-line help into trimmed non-empty lines', () => {
    const help = uiText('line one\n\n  line two  \n');
    expect(resolveUiTextLines(help, 'en-US')).toEqual(['line one', 'line two']);
  });
});
