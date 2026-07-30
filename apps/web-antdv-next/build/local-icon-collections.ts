import type { Plugin } from 'vite';

import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, resolve } from 'node:path';
import process from 'node:process';

import { normalizePath } from 'vite';

const LOCAL_ICON_MODULE = 'virtual:quant-pivot-local-icons';
const RESOLVED_LOCAL_ICON_MODULE = `\0${LOCAL_ICON_MODULE}`;
const SOURCE_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.rs',
  '.ts',
  '.tsx',
  '.vue',
]);
const SKIPPED_DIRECTORIES = new Set([
  '.git',
  '.turbo',
  '__tests__',
  'coverage',
  'dist',
  'node_modules',
  'test-results',
]);
const SUPPORTED_ICON_PREFIXES = new Set([
  'ant-design',
  'ep',
  'fluent-mdl2',
  'lucide',
  'mdi',
]);
const UI_ROOT = resolveUiRoot();
const APP_ROOT = resolve(UI_ROOT, 'apps/web-antdv-next');
const APP_ENTRY = normalizePath(resolve(APP_ROOT, 'src/main.ts'));
const DESIGN_REQUIRE = createRequire(
  resolve(UI_ROOT, 'packages/@core/base/design/package.json'),
);
const SOURCE_ROOTS = [
  resolve(APP_ROOT, 'src'),
  resolve(UI_ROOT, '../crates/quant-pivot-models/src/seed/rbac'),
  resolve(UI_ROOT, 'internal'),
  resolve(UI_ROOT, 'packages'),
];

interface IconifyAlias {
  hFlip?: boolean;
  parent: string;
  rotate?: number;
  vFlip?: boolean;
}

interface IconifyIcon {
  body: string;
  hFlip?: boolean;
  height?: number;
  left?: number;
  rotate?: number;
  top?: number;
  vFlip?: boolean;
  width?: number;
}

interface LocalIconCollection {
  aliases?: Record<string, IconifyAlias>;
  height?: number;
  hFlip?: boolean;
  icons: Record<string, IconifyIcon>;
  lastModified?: number;
  left?: number;
  prefix: string;
  provider?: string;
  rotate?: number;
  top?: number;
  vFlip?: boolean;
  width?: number;
}

interface LocalIconCollectionReport {
  collections: LocalIconCollection[];
  iconNames: Map<string, Set<string>>;
  sourceFiles: string[];
}

function extractLocalIconNames(source: string): Map<string, Set<string>> {
  const names = new Map<string, Set<string>>();
  const iconLiteral =
    /["'`]([a-z0-9]+(?:-[a-z0-9]+)*):([a-z0-9]+(?:-[a-z0-9]+)*)["'`]/g;
  for (const match of source.matchAll(iconLiteral)) {
    const prefix = match[1];
    const name = match[2];
    if (
      prefix === undefined ||
      name === undefined ||
      !SUPPORTED_ICON_PREFIXES.has(prefix)
    ) {
      continue;
    }
    const prefixNames = names.get(prefix) ?? new Set<string>();
    prefixNames.add(name);
    names.set(prefix, prefixNames);
  }
  return names;
}

async function collectLocalIconCollections(): Promise<LocalIconCollectionReport> {
  const iconNames = new Map<string, Set<string>>();
  const sourceFiles: string[] = [];
  for (const root of SOURCE_ROOTS) {
    await scanSourceTree(root, iconNames, sourceFiles);
  }

  const collections: LocalIconCollection[] = [];
  const sortedPrefixes = [...iconNames.keys()].toSorted();
  for (const prefix of sortedPrefixes) {
    const names = [...(iconNames.get(prefix) ?? [])].toSorted();
    const source = parseIconCollection(
      prefix,
      await readFile(
        DESIGN_REQUIRE.resolve(`@iconify/json/json/${prefix}.json`),
        'utf8',
      ),
    );
    const { collection, missing } = subsetIconCollection(source, names);
    if (missing.length > 0) {
      throw new Error(
        `Local Iconify collection ${prefix} is missing: ${missing.join(', ')}`,
      );
    }
    collections.push(collection);
  }

  return { collections, iconNames, sourceFiles };
}

function localIconCollectionsPlugin(): Plugin {
  return {
    enforce: 'pre',
    async load(id) {
      if (id !== RESOLVED_LOCAL_ICON_MODULE) {
        return null;
      }
      const report = await collectLocalIconCollections();
      for (const sourceFile of report.sourceFiles) {
        this.addWatchFile(sourceFile);
      }
      return renderRegistrationModule(report.collections);
    },
    name: 'quant-pivot-local-icon-collections',
    resolveId(id) {
      return id === LOCAL_ICON_MODULE ? RESOLVED_LOCAL_ICON_MODULE : null;
    },
    transform(code, id) {
      const sourceId = normalizePath(id.split('?')[0] ?? id);
      if (sourceId !== APP_ENTRY) {
        return null;
      }
      return `import '${LOCAL_ICON_MODULE}';\n${code}`;
    },
  };
}

function mergeIconNames(
  target: Map<string, Set<string>>,
  source: Map<string, Set<string>>,
) {
  for (const [prefix, names] of source) {
    const targetNames = target.get(prefix) ?? new Set<string>();
    for (const name of names) {
      targetNames.add(name);
    }
    target.set(prefix, targetNames);
  }
}

function parseIconCollection(
  expectedPrefix: string,
  source: string,
): LocalIconCollection {
  const parsed: unknown = JSON.parse(source);
  if (!isRecord(parsed) || parsed.prefix !== expectedPrefix) {
    throw new TypeError(`Invalid local Iconify collection: ${expectedPrefix}`);
  }
  const context = `local Iconify collection ${expectedPrefix}`;
  const aliases =
    parsed.aliases === undefined
      ? undefined
      : parseIconAliases(parsed.aliases, context);
  const height = optionalFiniteNumber(parsed, 'height', context);
  const hFlip = optionalBoolean(parsed, 'hFlip', context);
  const lastModified = optionalFiniteNumber(parsed, 'lastModified', context);
  const left = optionalFiniteNumber(parsed, 'left', context);
  const provider = optionalString(parsed, 'provider', context);
  const rotate = optionalFiniteNumber(parsed, 'rotate', context);
  const top = optionalFiniteNumber(parsed, 'top', context);
  const vFlip = optionalBoolean(parsed, 'vFlip', context);
  const width = optionalFiniteNumber(parsed, 'width', context);

  return {
    ...(aliases === undefined ? {} : { aliases }),
    ...(height === undefined ? {} : { height }),
    ...(hFlip === undefined ? {} : { hFlip }),
    icons: parseIconEntries(parsed.icons, context),
    ...(lastModified === undefined ? {} : { lastModified }),
    ...(left === undefined ? {} : { left }),
    prefix: expectedPrefix,
    ...(provider === undefined ? {} : { provider }),
    ...(rotate === undefined ? {} : { rotate }),
    ...(top === undefined ? {} : { top }),
    ...(vFlip === undefined ? {} : { vFlip }),
    ...(width === undefined ? {} : { width }),
  };
}

function renderRegistrationModule(collections: LocalIconCollection[]): string {
  const registrations = collections.map((collection) => {
    const serialized = JSON.stringify(collection);
    return [
      `if (!registerLocalIconCollection(${serialized})) {`,
      `  throw new TypeError('Failed to register local Iconify collection: ${collection.prefix}');`,
      '}',
    ].join('\n');
  });
  return [
    "import { addCollection as registerLocalIconCollection } from '@vben/icons';",
    ...registrations,
  ].join('\n');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalBoolean(
  source: Record<string, unknown>,
  key: string,
  context: string,
): boolean | undefined {
  const value = source[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'boolean') {
    throw new TypeError(`${context} has an invalid ${key}`);
  }
  return value;
}

function optionalFiniteNumber(
  source: Record<string, unknown>,
  key: string,
  context: string,
): number | undefined {
  const value = source[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${context} has an invalid ${key}`);
  }
  return value;
}

function optionalString(
  source: Record<string, unknown>,
  key: string,
  context: string,
): string | undefined {
  const value = source[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new TypeError(`${context} has an invalid ${key}`);
  }
  return value;
}

function parseIconAliases(
  value: unknown,
  context: string,
): Record<string, IconifyAlias> {
  if (!isRecord(value)) {
    throw new TypeError(`${context} has invalid aliases`);
  }
  const aliases: Record<string, IconifyAlias> = {};
  for (const [name, candidate] of Object.entries(value)) {
    if (
      !isRecord(candidate) ||
      typeof candidate.parent !== 'string' ||
      candidate.parent.length === 0
    ) {
      throw new TypeError(`${context} has an invalid alias ${name}`);
    }
    const hFlip = optionalBoolean(
      candidate,
      'hFlip',
      `${context} alias ${name}`,
    );
    const rotate = optionalFiniteNumber(
      candidate,
      'rotate',
      `${context} alias ${name}`,
    );
    const vFlip = optionalBoolean(
      candidate,
      'vFlip',
      `${context} alias ${name}`,
    );
    aliases[name] = {
      ...(hFlip === undefined ? {} : { hFlip }),
      parent: candidate.parent,
      ...(rotate === undefined ? {} : { rotate }),
      ...(vFlip === undefined ? {} : { vFlip }),
    };
  }
  return aliases;
}

function parseIconEntries(
  value: unknown,
  context: string,
): Record<string, IconifyIcon> {
  if (!isRecord(value)) {
    throw new TypeError(`${context} has invalid icons`);
  }
  const icons: Record<string, IconifyIcon> = {};
  for (const [name, candidate] of Object.entries(value)) {
    if (
      !isRecord(candidate) ||
      typeof candidate.body !== 'string' ||
      candidate.body.length === 0
    ) {
      throw new TypeError(`${context} has an invalid icon ${name}`);
    }
    const iconContext = `${context} icon ${name}`;
    const hFlip = optionalBoolean(candidate, 'hFlip', iconContext);
    const height = optionalFiniteNumber(candidate, 'height', iconContext);
    const left = optionalFiniteNumber(candidate, 'left', iconContext);
    const rotate = optionalFiniteNumber(candidate, 'rotate', iconContext);
    const top = optionalFiniteNumber(candidate, 'top', iconContext);
    const vFlip = optionalBoolean(candidate, 'vFlip', iconContext);
    const width = optionalFiniteNumber(candidate, 'width', iconContext);
    icons[name] = {
      body: candidate.body,
      ...(hFlip === undefined ? {} : { hFlip }),
      ...(height === undefined ? {} : { height }),
      ...(left === undefined ? {} : { left }),
      ...(rotate === undefined ? {} : { rotate }),
      ...(top === undefined ? {} : { top }),
      ...(vFlip === undefined ? {} : { vFlip }),
      ...(width === undefined ? {} : { width }),
    };
  }
  return icons;
}

function resolveUiRoot(): string {
  const cwd = normalizePath(process.cwd());
  const appMarker = '/apps/web-antdv-next';
  const appPosition = cwd.lastIndexOf(appMarker);
  return appPosition === -1 ? cwd : cwd.slice(0, appPosition);
}

function subsetIconCollection(
  source: LocalIconCollection,
  names: string[],
): { collection: LocalIconCollection; missing: string[] } {
  const aliases: Record<string, IconifyAlias> = {};
  const icons: Record<string, IconifyIcon> = {};
  const missing: string[] = [];

  for (const name of names) {
    const visited = new Set<string>();
    let current = name;
    while (!icons[current]) {
      const icon = source.icons[current];
      if (icon) {
        icons[current] = icon;
        break;
      }
      const alias = source.aliases?.[current];
      if (!alias) {
        missing.push(name);
        break;
      }
      if (visited.has(current)) {
        throw new TypeError(
          `Cyclic local Iconify alias: ${source.prefix}:${name}`,
        );
      }
      visited.add(current);
      aliases[current] = alias;
      current = alias.parent;
    }
  }

  return {
    collection: {
      ...(Object.keys(aliases).length === 0 ? {} : { aliases }),
      ...(source.height === undefined ? {} : { height: source.height }),
      ...(source.hFlip === undefined ? {} : { hFlip: source.hFlip }),
      icons,
      ...(source.lastModified === undefined
        ? {}
        : { lastModified: source.lastModified }),
      ...(source.left === undefined ? {} : { left: source.left }),
      prefix: source.prefix,
      ...(source.provider === undefined ? {} : { provider: source.provider }),
      ...(source.rotate === undefined ? {} : { rotate: source.rotate }),
      ...(source.top === undefined ? {} : { top: source.top }),
      ...(source.vFlip === undefined ? {} : { vFlip: source.vFlip }),
      ...(source.width === undefined ? {} : { width: source.width }),
    },
    missing,
  };
}

async function scanSourceTree(
  path: string,
  iconNames: Map<string, Set<string>>,
  sourceFiles: string[],
): Promise<void> {
  const entries = await readdir(path, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = resolve(path, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) {
        await scanSourceTree(entryPath, iconNames, sourceFiles);
      }
      continue;
    }
    if (!entry.isFile() || !SOURCE_EXTENSIONS.has(extname(entry.name))) {
      continue;
    }
    if (/\.(?:spec|test)\.[^.]+$/.test(entry.name)) {
      continue;
    }
    sourceFiles.push(entryPath);
    mergeIconNames(
      iconNames,
      extractLocalIconNames(await readFile(entryPath, 'utf8')),
    );
  }
}

export {
  collectLocalIconCollections,
  extractLocalIconNames,
  localIconCollectionsPlugin,
  renderRegistrationModule,
};
