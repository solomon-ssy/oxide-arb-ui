import { describe, expect, it } from 'vitest';

import { canvasColorFromHslToken, resolveThemeColor } from './theme-color';

const CANVAS_RGBA = /^rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (?:0|1|0\.\d+)\)$/;

describe('canvasColorFromHslToken', () => {
  it('emits comma rgba instead of CSS Color 4 hsl that ZRender cannot parse', () => {
    const opaque = canvasColorFromHslToken('199 89% 48%');
    const translucent = canvasColorFromHslToken('199 89% 48%', '30%');
    const tokenAlpha = canvasColorFromHslToken('145 52% 42% / 10%');
    const transparentStop = canvasColorFromHslToken('263 70% 50%', '0%');

    expect(opaque).toBe('rgba(13, 162, 231, 1)');
    expect(translucent).toBe('rgba(13, 162, 231, 0.3)');
    expect(tokenAlpha).toMatch(CANVAS_RGBA);
    expect(tokenAlpha.endsWith(', 0.1)')).toBe(true);
    expect(transparentStop).toBe('rgba(107, 38, 217, 0)');
    expect(opaque).not.toContain('hsl(');
    expect(translucent).not.toContain('/');
  });

  it('uses explicit alpha over a token-embedded alpha', () => {
    expect(canvasColorFromHslToken('199 89% 48% / 10%', '30%')).toBe(
      'rgba(13, 162, 231, 0.3)',
    );
  });

  it('falls back to transparent instead of currentColor or modern hsl()', () => {
    expect(canvasColorFromHslToken('')).toBe('rgba(0, 0, 0, 0)');
    expect(canvasColorFromHslToken('not-a-color')).toBe('rgba(0, 0, 0, 0)');
  });

  it('round-trips CSS primary hues', () => {
    expect(canvasColorFromHslToken('0 100% 50%')).toBe('rgba(255, 0, 0, 1)');
    expect(canvasColorFromHslToken('120 100% 50%')).toBe('rgba(0, 255, 0, 1)');
    expect(canvasColorFromHslToken('240 100% 50%')).toBe('rgba(0, 0, 255, 1)');
  });
});

describe('resolveThemeColor', () => {
  it('reads channel tokens through CSS variables into canvas rgba', () => {
    document.documentElement.style.setProperty(
      '--qp-accent-sky',
      '199 89% 48%',
    );
    document.documentElement.style.setProperty(
      '--qp-chart-cat-1',
      'var(--qp-accent-sky)',
    );

    expect(resolveThemeColor('--qp-chart-cat-1', '16%')).toBe(
      'rgba(13, 162, 231, 0.16)',
    );
  });
});
