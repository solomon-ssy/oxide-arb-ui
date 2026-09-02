import type { EnumTone } from '#/shared/presentation/enum-presentation';

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

const APP_ROOT = join(process.cwd(), 'apps/web-antdv-next');
const SOURCE_ROOT = join(APP_ROOT, 'src');
const TOKENS_PATH = join(SOURCE_ROOT, 'styles/tokens.css');
const TOKEN_PATTERN = /--qp-[\w-]+/g;
type RgbColor = [number, number, number];

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() && /\.(?:css|ts|vue)$/.test(entry.name) ? [path] : [];
  });
}

function tokens(content: string, pattern: RegExp): Set<string> {
  return new Set(
    [...content.matchAll(pattern)].flatMap((match) => match[0] ?? []),
  );
}

function hslToRgb(value: string): RgbColor {
  const match = value.match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!match) throw new Error(`invalid HSL token value: ${value}`);

  const hue = (Number(match[1]) % 360) / 360;
  const saturation = Number(match[2]) / 100;
  const lightness = Number(match[3]) / 100;
  if (saturation === 0) return [lightness, lightness, lightness];

  const upper =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const lower = 2 * lightness - upper;
  const channel = (offset: number) => {
    let shifted = hue + offset;
    if (shifted < 0) shifted += 1;
    if (shifted > 1) shifted -= 1;
    if (shifted < 1 / 6) return lower + (upper - lower) * 6 * shifted;
    if (shifted < 1 / 2) return upper;
    if (shifted < 2 / 3) {
      return lower + (upper - lower) * (2 / 3 - shifted) * 6;
    }
    return lower;
  };

  return [channel(1 / 3), channel(0), channel(-1 / 3)];
}

function relativeLuminance(value: RgbColor): number {
  const channels = value.map((channel) =>
    channel <= 0.040_45 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return (
    0.2126 * (channels[0] ?? 0) +
    0.7152 * (channels[1] ?? 0) +
    0.0722 * (channels[2] ?? 0)
  );
}

function contrastRatio(
  foreground: string,
  background: string,
  opacity = 1,
  surface = background,
): number {
  const foregroundLuminance = relativeLuminance(hslToRgb(foreground));
  const backgroundRgb = hslToRgb(background);
  const surfaceRgb = hslToRgb(surface);
  const composited: RgbColor = [
    backgroundRgb[0] * opacity + surfaceRgb[0] * (1 - opacity),
    backgroundRgb[1] * opacity + surfaceRgb[1] * (1 - opacity),
    backgroundRgb[2] * opacity + surfaceRgb[2] * (1 - opacity),
  ];
  const backgroundLuminance = relativeLuminance(composited);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function declarations(
  content: string,
  selector: string,
): Record<string, string> {
  const start = content.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`missing CSS selector: ${selector}`);
  const end = content.indexOf('}', start);
  const body = content.slice(start, end);
  return Object.fromEntries(
    [...body.matchAll(/(--qp-[\w-]+)\s*:\s*([^;]+);/g)].map((match) => [
      match[1],
      match[2]?.trim(),
    ]),
  );
}

function resolveToken(values: Record<string, string>, token: string): string {
  const value = values[token];
  if (!value) throw new Error(`missing CSS token: ${token}`);
  const reference = value.match(/^var\((--qp-[\w-]+)\)$/)?.[1];
  return reference ? resolveToken(values, reference) : value;
}

function tokenValues(content: string, token: string): string[] {
  return [
    ...content.matchAll(new RegExp(String.raw`${token}\s*:\s*([^;]+);`, 'g')),
  ]
    .map((match) => match[1]?.trim())
    .filter((value): value is string => value !== undefined);
}

describe('qp design-token contract', () => {
  const tokenSource = readFileSync(TOKENS_PATH, 'utf8');

  it('defines every consumed QP token', () => {
    const definitions = new Set(
      sourceFiles(SOURCE_ROOT).flatMap((path) => [
        ...tokens(readFileSync(path, 'utf8'), /--qp-[\w-]+(?=\s*:)/g),
      ]),
    );
    const missing = sourceFiles(SOURCE_ROOT).flatMap((path) => {
      const consumed = tokens(
        readFileSync(path, 'utf8'),
        /(?<=var\()--qp-[\w-]+/g,
      );
      return [...consumed]
        .filter((token) => !definitions.has(token))
        .map((token) => `${relative(APP_ROOT, path)}:${token}`);
    });

    expect(missing.toSorted()).toEqual([]);
  });

  it('defines theme-sensitive surfaces, borders, shadows, and soft states twice', () => {
    const required = [
      '--qp-action-primary-solid',
      '--qp-action-primary-solid-hover',
      '--qp-action-warning-solid',
      '--qp-action-warning-solid-hover',
      '--qp-border-strong',
      '--qp-shadow-focus',
      '--qp-shadow-subtle',
      '--qp-status-danger-ink',
      '--qp-status-danger-soft',
      '--qp-status-neutral-ink',
      '--qp-status-neutral-soft',
      '--qp-status-paused-ink',
      '--qp-status-paused-soft',
      '--qp-status-queued-ink',
      '--qp-status-queued-soft',
      '--qp-status-running-ink',
      '--qp-status-running-soft',
      '--qp-status-success-ink',
      '--qp-status-success-soft',
      '--qp-status-warning-ink',
      '--qp-status-warning-soft',
      '--qp-surface-glass',
      '--qp-surface-sunken',
    ];

    for (const token of required) {
      expect(
        tokenSource.match(new RegExp(String.raw`${token}\s*:`, 'g')),
      ).toHaveLength(2);
    }
  });

  it('keeps every status-chip tone at WCAG AA contrast on theme surfaces', () => {
    const chipSource = readFileSync(
      join(SOURCE_ROOT, 'shared/components/status-chip.vue'),
      'utf8',
    );
    const opacities = [
      ...chipSource.matchAll(
        /background:\s*hsl\(var\(--qp-tone-color\)\s*\/\s*(\d+)%\)/g,
      ),
    ].map((match) => Number(match[1]) / 100);
    expect(opacities).toEqual([0.1, 0.14]);
    expect(chipSource).toContain('color: hsl(var(--qp-tone-ink))');

    const tones = {
      category: [undefined, ...Array.from({ length: 13 }, (_, hue) => hue)],
      danger: [undefined],
      neutral: [undefined],
      paused: [undefined],
      queued: [undefined],
      running: [undefined],
      success: [undefined],
      warning: [undefined],
    } satisfies Record<EnumTone, (number | undefined)[]>;
    const surfaces = [
      'canvas',
      'base',
      'raised',
      'inset',
      'overlay',
      'glass',
      'sunken',
    ];
    const light = declarations(tokenSource, ':root');
    const themes = {
      dark: { ...light, ...declarations(tokenSource, '.dark') },
      light,
    };

    for (const [theme, values] of Object.entries(themes)) {
      for (const [tone, hues] of Object.entries(tones)) {
        for (const hue of hues) {
          const toneValues = {
            ...values,
            ...declarations(tokenSource, '.qp-tone'),
            ...declarations(tokenSource, `.qp-tone[data-tone='${tone}']`),
            ...(hue
              ? declarations(
                  tokenSource,
                  `.qp-tone[data-category-hue='${hue}']`,
                )
              : {}),
          };
          const foreground = resolveToken(toneValues, '--qp-tone-ink');
          const background = resolveToken(toneValues, '--qp-tone-color');
          for (const surface of surfaces) {
            for (const opacity of opacities) {
              const ratio = contrastRatio(
                foreground,
                background,
                opacity,
                resolveToken(values, `--qp-surface-${surface}`),
              );
              expect(
                ratio,
                `${theme}/${tone}/${hue ?? 'none'}/${surface}/${opacity}`,
              ).toBeGreaterThanOrEqual(4.5);
            }
          }
        }
      }
    }
  });

  it('keeps semantic primary action surfaces at WCAG AA contrast', () => {
    const foreground = tokenValues(tokenSource, '--qp-text-on-accent')[0];
    if (!foreground) throw new Error('missing --qp-text-on-accent');

    for (const token of [
      '--qp-action-primary-solid',
      '--qp-action-primary-solid-hover',
    ]) {
      const backgrounds = tokenValues(tokenSource, token);
      expect(backgrounds).toHaveLength(2);
      for (const background of backgrounds) {
        expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    }
  });

  it('keeps open select values opaque without exposing search-hidden values', () => {
    const rule = tokenSource.match(
      /(\.ant-select-single\.ant-select-open[^{}]+)\{([^{}]+)\}/,
    );
    const selector = rule?.[1]?.trim().replaceAll(/\s+/g, ' ');
    expect(rule?.[2]?.trim()).toBe('opacity: 1;');
    if (!selector) throw new Error('missing open select value opacity rule');

    for (const state of [
      { input: '', matches: true, select: '' },
      { input: '', matches: false, select: 'ant-select-disabled' },
      { input: '', matches: false, select: 'ant-select-customize' },
      {
        input: 'ant-select-content-has-search-value',
        matches: false,
        select: '',
      },
    ]) {
      const control = document.createElement('div');
      control.className = `ant-select ant-select-single ant-select-open ${state.select}`;
      const value = document.createElement('span');
      value.className = `ant-select-content ant-select-content-has-value ${state.input}`;
      control.append(value);
      expect(value.matches(selector)).toBe(state.matches);
    }

    const foregrounds = tokenValues(tokenSource, '--qp-text-primary');
    const backgrounds = tokenValues(tokenSource, '--qp-surface-base');
    expect(foregrounds).toHaveLength(2);
    expect(backgrounds).toHaveLength(2);
    for (const [index, foreground] of foregrounds.entries()) {
      const background = backgrounds[index];
      if (!background) throw new Error('missing select background');
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps brand accents out of enum status components', () => {
    const enumComponents = sourceFiles(
      join(SOURCE_ROOT, 'shared/components/enum'),
    )
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n');
    const brandTokens = tokens(enumComponents, TOKEN_PATTERN).values();

    expect(
      [...brandTokens].filter((token) =>
        /--qp-(?:accent|gradient|glow)-(?:sky|violet|pink|orange|brand)/.test(
          token,
        ),
      ),
    ).toEqual([]);
  });

  it('reserves CSS keyframes for running-state scan and pulse only', () => {
    const keyframes = sourceFiles(SOURCE_ROOT).flatMap((path) => [
      ...readFileSync(path, 'utf8').matchAll(/@keyframes\s+([\w-]+)/g),
    ]);

    expect(keyframes.map((match) => match[1]).toSorted()).toEqual([
      'qp-scan',
      'qp-status-pulse',
    ]);
  });
});
