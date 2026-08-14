import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

const APP_ROOT = join(process.cwd(), 'apps/web-antdv-next');
const SOURCE_ROOT = join(APP_ROOT, 'src');
const TOKENS_PATH = join(SOURCE_ROOT, 'styles/tokens.css');
const TOKEN_PATTERN = /--qp-[\w-]+/g;

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
      '--qp-border-strong',
      '--qp-shadow-focus',
      '--qp-shadow-subtle',
      '--qp-status-danger-soft',
      '--qp-status-neutral-soft',
      '--qp-status-paused-soft',
      '--qp-status-queued-soft',
      '--qp-status-running-soft',
      '--qp-status-success-soft',
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
