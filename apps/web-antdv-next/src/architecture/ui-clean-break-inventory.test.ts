import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

type JsonObject = Record<string, unknown>;

interface KnipFileIssue {
  files?: Array<{ name: string }>;
}

interface KnipReport {
  issues: KnipFileIssue[];
}

interface SourceFile {
  content: string;
  path: string;
}

const UI_ROOT = process.cwd();
const APP_ROOT = join(UI_ROOT, 'apps/web-antdv-next');
const REPOSITORY_ROOT = resolve(UI_ROOT, '..');

const legacyPath = (...parts: string[]) => parts.join('/');
const hyphenated = (...parts: string[]) => parts.join('-');

const BASELINE = {
  orphanFiles: 9,
  pageKeys: { en: 3984, zh: 4003 },
  viewFiles: 267,
  viewLines: 53_452,
} as const;

const LEGACY_PATHS = [
  legacyPath('src', 'api', 'core', 'upload.ts'),
  legacyPath(
    'src',
    'shared',
    'components',
    `${hyphenated('dashboard', 'accent')}.ts`,
  ),
  legacyPath(
    'src',
    'shared',
    'components',
    `${hyphenated('dashboard', 'panel')}.vue`,
  ),
  legacyPath(
    'src',
    'shared',
    'components',
    `${hyphenated('data', 'list')}.vue`,
  ),
  legacyPath(
    'src',
    'shared',
    'components',
    `${hyphenated('detail', 'back', 'nav')}.vue`,
  ),
  legacyPath(
    'src',
    'shared',
    'components',
    `${hyphenated('detail', 'section', 'card')}.vue`,
  ),
  legacyPath(
    'src',
    'shared',
    'components',
    `${hyphenated('echarts', 'card')}.vue`,
  ),
  legacyPath(
    'src',
    'shared',
    'components',
    `${hyphenated('entity', 'detail', 'header')}.vue`,
  ),
  legacyPath(
    'src',
    'shared',
    'components',
    `${hyphenated('entity', 'route', 'button')}.vue`,
  ),
  legacyPath(
    'src',
    'shared',
    'components',
    `${hyphenated('feature', 'parity', 'status', 'panel')}.vue`,
  ),
  legacyPath(
    'src',
    'shared',
    'components',
    'format',
    `${hyphenated('tag', 'options')}.ts`,
  ),
  legacyPath('src', 'shared', 'components', 'index.ts'),
  legacyPath(
    'src',
    'shared',
    'components',
    `${hyphenated('key', 'value', 'grid')}.vue`,
  ),
  legacyPath(
    'src',
    'shared',
    'components',
    `${hyphenated('kpi', 'stat', 'card')}.vue`,
  ),
  legacyPath(
    'src',
    'shared',
    'components',
    `${hyphenated('page', 'placeholder')}.vue`,
  ),
  legacyPath(
    'src',
    'shared',
    'components',
    `${hyphenated('stat', 'card')}.vue`,
  ),
  legacyPath(
    'src',
    'shared',
    'components',
    `${hyphenated('state', 'badge')}.vue`,
  ),
  legacyPath(
    'src',
    'shared',
    'components',
    `${hyphenated('waterfall', 'chart')}.vue`,
  ),
  legacyPath('src', 'shared', 'composables', 'index.ts'),
  legacyPath(
    'src',
    'shared',
    'composables',
    `${hyphenated('use', 'dashboard', 'metrics')}.ts`,
  ),
  legacyPath(
    'src',
    'shared',
    'composables',
    `${hyphenated('use', 'route', 'time', 'window')}.ts`,
  ),
  legacyPath(
    'src',
    'shared',
    'composables',
    `${hyphenated('use', 'time', 'range', 'query')}.ts`,
  ),
  legacyPath('src', 'views', 'config'),
  legacyPath('src', 'views', 'markets'),
  legacyPath('src', 'views', hyphenated('operation', 'log')),
  legacyPath('src', 'views', 'quant', 'account'),
  legacyPath('src', 'views', 'quant', hyphenated('execution', 'orders')),
  legacyPath('src', 'views', 'quant', 'intents'),
  legacyPath('src', 'views', 'quant', 'positions'),
  legacyPath('src', 'views', 'quant', 'recommendations'),
  legacyPath('src', 'views', 'quant', 'reconciliations'),
  legacyPath('src', 'views', 'quant', 'reports'),
  legacyPath('src', 'views', 'quant', hyphenated('settlement', 'redeems')),
  legacyPath('src', 'views', 'quant', 'shared'),
  legacyPath('src', 'views', 'quant', 'structural'),
  legacyPath('src', 'views', 'research', 'backtests'),
  legacyPath('src', 'views', 'research', hyphenated('basis', 'alerts')),
  legacyPath(
    'src',
    'views',
    'research',
    hyphenated('calibration', 'artifacts'),
  ),
  legacyPath('src', 'views', 'research', 'comparisons'),
  legacyPath('src', 'views', 'research', 'datasets'),
  legacyPath('src', 'views', 'research', hyphenated('domain', 'sources')),
  legacyPath('src', 'views', 'research', 'factors'),
  legacyPath('src', 'views', 'research', hyphenated('feature', 'integrity')),
  legacyPath('src', 'views', 'research', 'feedback'),
  legacyPath('src', 'views', 'research', 'jobs'),
  legacyPath('src', 'views', 'research', hyphenated('market', 'linkages')),
  legacyPath('src', 'views', 'research', hyphenated('model', 'specs')),
  legacyPath('src', 'views', 'research', 'models'),
  legacyPath('src', 'views', 'research', 'shared'),
  legacyPath('src', 'views', 'research', hyphenated('trade', 'policies')),
  legacyPath('src', 'views', 'research', hyphenated('trade', 'policy', 'fits')),
  legacyPath('src', 'views', hyphenated('runtime', 'config')),
] as const;

const LEGACY_SYMBOLS = {
  'src/api/account.ts': [
    'getAccountSnapshot',
    'getEquitySnapshot',
    'getLatestEquitySnapshot',
    'getLatestEquitySnapshotOptional',
  ],
  'src/api/calibration.ts': ['listAllCalibrationArtifacts'],
  'src/api/core/menu.ts': ['getAccessibleMenusApi'],
  'src/api/data-quality.ts': ['getDataQualitySnapshot'],
  'src/api/quant-reports.ts': [
    'getCurrentQuantReport',
    'getMostRecentCurrentReportOptional',
  ],
  'src/api/research.ts': ['listComparisonReports'],
  'src/api/system.ts': ['getExecutionRecovery', 'getSystemHealth'],
  'src/api/trade-policies.ts': [
    'getTradePolicyProfile',
    'getTradePolicyValidation',
  ],
} as const;

function collectFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(path));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

function localeLeaves(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') {
    return [prefix];
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`Locale leaf ${prefix} must be a string`);
  }
  return Object.entries(value).flatMap(([key, child]) =>
    localeLeaves(child, prefix ? `${prefix}.${key}` : key),
  );
}

function loadJson(path: string): JsonObject {
  return JSON.parse(readFileSync(path, 'utf8')) as JsonObject;
}

function productionSources(): SourceFile[] {
  const sourcePaths = collectFiles(join(APP_ROOT, 'src')).filter(
    (path) =>
      /\.(?:ts|vue)$/.test(path) &&
      !/\.(?:spec|test)\.ts$/.test(path) &&
      !path.includes(`${join('src', 'locales', 'langs')}/`),
  );
  sourcePaths.push(
    join(REPOSITORY_ROOT, 'crates/quant-pivot-models/src/seed/rbac/menus.rs'),
  );
  return sourcePaths.map((path) => ({
    content: readFileSync(path, 'utf8'),
    path,
  }));
}

function referencedPageKeys(sources: SourceFile[]) {
  const exact = new Set<string>();
  const prefixes = new Set<string>();
  const literalPattern = /["'`](page(?:\.[\w-]+)+\.?)["'`]/g;
  const templatePrefixPattern = /`(page(?:\.[\w-]+)+\.)\$\{/g;

  for (const { content } of sources) {
    for (const match of content.matchAll(literalPattern)) {
      const key = match[1];
      if (key?.endsWith('.')) {
        prefixes.add(key);
      } else if (key) {
        exact.add(key);
      }
    }
    for (const match of content.matchAll(templatePrefixPattern)) {
      if (match[1]) {
        prefixes.add(match[1]);
      }
    }
  }
  return { exact, prefixes };
}

function unusedPageKeys(keys: string[], sources: SourceFile[]): string[] {
  const { exact, prefixes } = referencedPageKeys(sources);
  return keys
    .map((key) => `page.${key}`)
    .filter(
      (key) =>
        !exact.has(key) &&
        ![...prefixes].some((prefix) => key.startsWith(prefix)),
    )
    .toSorted();
}

function orphanModules(): string[] {
  const requireFromVsh = createRequire(
    join(UI_ROOT, 'scripts/vsh/package.json'),
  );
  const knipMain = requireFromVsh.resolve('knip');
  const knipCli = join(dirname(knipMain), '..', 'bin', 'knip.js');
  const result = spawnSync(
    process.execPath,
    [
      knipCli,
      '--workspace',
      'apps/web-antdv-next',
      '--include',
      'files',
      '--reporter',
      'json',
      '--no-config-hints',
    ],
    { cwd: UI_ROOT, encoding: 'utf8' },
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(result.stderr || 'Knip failed without diagnostic output');
  }
  const report = JSON.parse(result.stdout || '{"issues":[]}') as KnipReport;
  return report.issues
    .flatMap(({ files = [] }) => files.map(({ name }) => name))
    .toSorted();
}

function existingLegacyInventory(): string[] {
  const paths = LEGACY_PATHS.filter((path) => existsSync(join(APP_ROOT, path)))
    .map((path) => `path:${path}`)
    .toSorted();
  const symbols = Object.entries(LEGACY_SYMBOLS).flatMap(
    ([path, candidates]) => {
      const absolutePath = join(APP_ROOT, path);
      if (!existsSync(absolutePath)) {
        return [];
      }
      const content = readFileSync(absolutePath, 'utf8');
      return candidates
        .filter((symbol) =>
          new RegExp(
            String.raw`\b${symbol.replaceAll('$', String.raw`\$`)}\b`,
          ).test(content),
        )
        .map((symbol) => `symbol:${path}#${symbol}`);
    },
  );
  return [...paths, ...symbols].toSorted();
}

describe('ui fresh-boot clean-break inventory', () => {
  it('removes every superseded path and symbol', () => {
    expect(
      existingLegacyInventory(),
      `This inventory must shrink to zero from ${BASELINE.viewFiles} view files / ${BASELINE.viewLines} lines.`,
    ).toEqual([]);
  });

  it('contains no orphan application modules', () => {
    expect(
      orphanModules(),
      `Audited baseline contained ${BASELINE.orphanFiles} orphan modules.`,
    ).toEqual([]);
  }, 30_000);

  it('routes generated enum filters through EnumSelect and enumOptions', () => {
    const violations = productionSources()
      .filter(({ content }) =>
        /component:\s*'Select'[\s\S]{0,320}options:\s*(?:Object\.values|enumOptions\()/m.test(
          content,
        ),
      )
      .map(({ path }) => path.slice(APP_ROOT.length + 1))
      .toSorted();

    expect(violations).toEqual([]);
  });

  it('paints generated enums with EnumTag instead of antd Tag colors', () => {
    const violations = productionSources()
      .filter(
        ({ content, path }) =>
          path.endsWith('.vue') &&
          /:color="[^"]*enumOption\(|:color="\w+Tag\??\.color"/.test(content),
      )
      .map(({ path }) => path.slice(APP_ROOT.length + 1))
      .toSorted();

    expect(violations).toEqual([]);
  });

  it('keeps object inspector definition lists single-column', () => {
    const violations = productionSources()
      .filter(
        ({ content, path }) =>
          path.includes(`${hyphenated('object', 'inspector')}`) &&
          /Descriptions[\s\S]{0,80}:column="2"/.test(content),
      )
      .map(({ path }) => path.slice(APP_ROOT.length + 1))
      .toSorted();

    expect(violations).toEqual([]);
  });

  it('contains workspace chrome overflow on both axes', () => {
    const chrome = [
      'src/shared/components/workspace/workspace-object-stage.vue',
      'src/shared/components/workspace/workspace-inspector-surface.vue',
    ].map((relative) => ({
      relative,
      content: readFileSync(join(APP_ROOT, relative), 'utf8'),
    }));
    const missing = chrome
      .filter(
        ({ content }) =>
          !(
            content.includes('overflow-x: clip') ||
            content.includes('overflow: clip auto')
          ) ||
          !content.includes('container-type: inline-size') ||
          !content.includes('min-width: 0'),
      )
      .map(({ relative }) => relative);

    expect(missing).toEqual([]);
  });

  it('hides list pane descendants while object stage is open', () => {
    const content = readFileSync(
      join(
        APP_ROOT,
        'src/shared/components/workspace/workspace-inspector-host.vue',
      ),
      'utf8',
    );

    expect(content.includes('is-object-stage .workspace-module-pane')).toBe(
      true,
    );
    expect(content.includes('display: none')).toBe(true);
  });

  it('keeps page locales symmetric and free of dead keys', () => {
    const localeRoot = join(APP_ROOT, 'src/locales/langs');
    const english = localeLeaves(loadJson(join(localeRoot, 'en-US/page.json')));
    const chinese = localeLeaves(loadJson(join(localeRoot, 'zh-CN/page.json')));
    const sources = productionSources();
    const englishKeys = new Set(english);
    const chineseKeys = new Set(chinese);

    expect(
      {
        deadEnglish: unusedPageKeys(english, sources),
        deadChinese: unusedPageKeys(chinese, sources),
        missingInChinese: english
          .filter((key) => !chineseKeys.has(key))
          .toSorted(),
        missingInEnglish: chinese
          .filter((key) => !englishKeys.has(key))
          .toSorted(),
      },
      `Audited page-key baseline: en=${BASELINE.pageKeys.en}, zh=${BASELINE.pageKeys.zh}`,
    ).toEqual({
      deadEnglish: [],
      deadChinese: [],
      missingInChinese: [],
      missingInEnglish: [],
    });
  });
});
