import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const APP_ROOT = resolve(process.cwd(), 'apps/web-antdv-next');
const SRC_ROOT = join(APP_ROOT, 'src');

interface SourceFile {
  content: string;
  path: string;
}

function collectSources(root: string): SourceFile[] {
  const files: SourceFile[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSources(path));
      continue;
    }
    if (
      !entry.isFile() ||
      !/\.(?:ts|vue)$/.test(path) ||
      /\.(?:spec|test)\.ts$/.test(path)
    ) {
      continue;
    }
    files.push({ content: readFileSync(path, 'utf8'), path });
  }
  return files;
}

function relativeSrc(path: string): string {
  return relative(SRC_ROOT, path);
}

describe('table contract', () => {
  const sources = collectSources(SRC_ROOT);

  it('forbids left or right column alignment in production source', () => {
    const pattern = /\balign:\s*['"](?:left|right)['"]/;
    const violations = sources
      .filter(({ content }) => pattern.test(content))
      .map(({ path }) => relativeSrc(path))
      .toSorted();
    expect(violations).toEqual([]);
  });

  it('forbids text-only table detail operations', () => {
    const pattern = /code:\s*['"]detail['"][\s\S]{0,120}text:/;
    const violations = sources
      .filter(({ content }) => pattern.test(content))
      .map(({ path }) => relativeSrc(path))
      .toSorted();
    expect(violations).toEqual([]);
  });

  it('centers toolbar status chips and table chip clusters', () => {
    const statusChip = sources.find(
      ({ path }) => relativeSrc(path) === 'shared/components/status-chip.vue',
    );
    expect(statusChip).toBeDefined();
    expect(statusChip?.content).toContain("size?: 'compact' | 'control'");
    expect(statusChip?.content).toContain("[data-size='control']");
    expect(statusChip?.content).toContain('width: fit-content');
    expect(statusChip?.content).toContain('min-height: 2.75rem');
    expect(statusChip?.content).toContain('justify-content: center');

    const tokens = readFileSync(join(SRC_ROOT, 'styles/tokens.css'), 'utf8');
    expect(tokens).toContain('.qp-chip-cluster');
    expect(tokens).toContain('.vxe-table .vxe-cell > .flex');
    expect(tokens).toContain('justify-content: center');
  });

  it('renders identity deep links in the accent link style', () => {
    const link = sources.find(
      ({ path }) =>
        relativeSrc(path) === 'shared/components/entity-route-link.vue',
    );
    expect(link).toBeDefined();
    expect(link?.content).toContain('qp-entity-link');
    expect(link?.content).not.toContain('text-foreground');

    const tokens = readFileSync(join(SRC_ROOT, 'styles/tokens.css'), 'utf8');
    expect(tokens).toContain('.qp-entity-link');
    expect(tokens).toContain('--qp-accent-sky-ink');
  });

  it('routes named identity columns through path builders', () => {
    const required = [
      [
        'views/research/lab/modules/datasets/modules/schemas/table-columns.ts',
        'modelSpecOpenPath',
      ],
      [
        'views/research/lab/modules/models/modules/schemas/table-columns.ts',
        'modelSpecOpenPath',
      ],
      [
        'views/research/learning-policy/modules/policies/modules/schemas/table-columns.ts',
        'tradePolicyOpenPath',
      ],
      [
        'views/research/learning-policy/modules/policies/modules/schemas/table-columns.ts',
        'trainingDatasetOpenPath',
      ],
      ['adapter/vxe-table.ts', 'marketOpenPath'],
    ] as const;

    const missing = required
      .filter(([relativePath, symbol]) => {
        const source = sources.find(
          ({ path }) => relativeSrc(path) === relativePath,
        );
        return !source?.content.includes(symbol);
      })
      .map(([relativePath, symbol]) => `${relativePath} ${symbol}`);
    expect(missing).toEqual([]);
  });
});
