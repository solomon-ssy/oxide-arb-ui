import type { Plugin } from 'vite';

import { Buffer } from 'node:buffer';
import { extname } from 'node:path';
import { gzipSync } from 'node:zlib';

import { normalizePath } from 'vite';

type BundleEntry =
  | {
      code: string;
      facadeModuleId?: null | string;
      fileName: string;
      type: 'chunk';
    }
  | {
      fileName: string;
      source: string | Uint8Array;
      type: 'asset';
    };

type BundleOutput = Record<string, BundleEntry>;

interface ForbiddenBundlePattern {
  id: string;
  pattern: RegExp;
}

interface RouteChunkBudget {
  id: string;
  maxGzipBytes: number;
  maxRawBytes: number;
  moduleIdSuffix: string;
}

interface ProductionBundlePolicy {
  forbiddenPatterns: readonly ForbiddenBundlePattern[];
  routeChunks: readonly RouteChunkBudget[];
}

interface RouteChunkMeasurement {
  fileName: string;
  gzipBytes: number;
  id: string;
  rawBytes: number;
}

interface BundlePolicyReport {
  routeChunks: RouteChunkMeasurement[];
  violations: string[];
}

const TEXT_ASSET_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.map',
  '.mjs',
  '.svg',
  '.txt',
  '.xml',
]);

const OPERATOR_CONSOLE_BUNDLE_POLICY = {
  forbiddenPatterns: [
    { id: 'mock-api', pattern: /mock-napi/i },
    { id: 'query-token', pattern: /[?&]token=/i },
    { id: 'encoded-bearer', pattern: /Bearer%20/i },
    { id: 'secure-key-name', pattern: /VITE_APP_STORE_SECURE_KEY/i },
    { id: 'unresolved-placeholder', pattern: /REPLACE_WITH/i },
    { id: 'baidu-analytics', pattern: /hm\.baidu\.com/i },
    { id: 'upstream-static-source', pattern: /@vbenjs\/static-source/i },
    { id: 'retired-product-name', pattern: /Oxide Arb/i },
    { id: 'upstream-product-name', pattern: /Vben Admin/i },
    { id: 'upstream-domain', pattern: /www\.vben\.pro/i },
    { id: 'upstream-announcement', pattern: /ann\.vben/i },
    { id: 'upstream-chat', pattern: /open\.dingtalk/i },
  ],
  routeChunks: [
    {
      id: 'dashboard',
      maxGzipBytes: 40 * 1024,
      maxRawBytes: 128 * 1024,
      moduleIdSuffix: '/src/views/dashboard/index.vue',
    },
  ],
} as const satisfies ProductionBundlePolicy;

function evaluateProductionBundle(
  bundle: BundleOutput,
  policy: ProductionBundlePolicy = OPERATOR_CONSOLE_BUNDLE_POLICY,
): BundlePolicyReport {
  validatePolicy(policy);

  const entries = Object.values(bundle);
  const violations = scanForbiddenPatterns(entries, policy.forbiddenPatterns);
  const routeChunks: RouteChunkMeasurement[] = [];

  for (const budget of policy.routeChunks) {
    const matches = entries.filter(
      (entry) =>
        entry.type === 'chunk' &&
        entry.facadeModuleId !== null &&
        entry.facadeModuleId !== undefined &&
        normalizePath(entry.facadeModuleId).endsWith(budget.moduleIdSuffix),
    );

    if (matches.length === 0) {
      violations.push(
        `[route-chunk-missing] ${budget.id}: ${budget.moduleIdSuffix}`,
      );
      continue;
    }
    if (matches.length > 1) {
      violations.push(
        `[route-chunk-ambiguous] ${budget.id}: matched ${matches
          .map(({ fileName }) => fileName)
          .join(', ')}`,
      );
      continue;
    }

    const [chunk] = matches;
    if (!chunk || chunk.type !== 'chunk') {
      continue;
    }
    const rawBytes = Buffer.byteLength(chunk.code);
    const gzipBytes = gzipSync(Buffer.from(chunk.code), {
      level: 9,
    }).byteLength;
    routeChunks.push({
      fileName: chunk.fileName,
      gzipBytes,
      id: budget.id,
      rawBytes,
    });

    if (rawBytes > budget.maxRawBytes) {
      violations.push(
        `[route-raw-budget] ${budget.id}: ${rawBytes} > ${budget.maxRawBytes} bytes (${chunk.fileName})`,
      );
    }
    if (gzipBytes > budget.maxGzipBytes) {
      violations.push(
        `[route-gzip-budget] ${budget.id}: ${gzipBytes} > ${budget.maxGzipBytes} bytes (${chunk.fileName})`,
      );
    }
  }

  return { routeChunks, violations };
}

function productionBundlePolicyPlugin(
  policy: ProductionBundlePolicy = OPERATOR_CONSOLE_BUNDLE_POLICY,
): Plugin {
  return {
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const report = evaluateProductionBundle(bundle, policy);
      if (report.violations.length > 0) {
        this.error(formatBundlePolicyFailure(report));
      }
    },
    name: 'quant-pivot-production-bundle-policy',
  };
}

function formatBundlePolicyFailure(report: BundlePolicyReport): string {
  return [
    'Production bundle policy failed:',
    ...report.violations.map((violation) => `- ${violation}`),
  ].join('\n');
}

function scanForbiddenPatterns(
  entries: BundleEntry[],
  patterns: readonly ForbiddenBundlePattern[],
): string[] {
  const violations: string[] = [];
  for (const entry of entries) {
    const text = emittedText(entry);
    if (text === null) {
      continue;
    }
    for (const { id, pattern } of patterns) {
      if (pattern.test(text)) {
        violations.push(`[forbidden-pattern] ${id}: ${entry.fileName}`);
      }
    }
  }
  return violations;
}

function emittedText(entry: BundleEntry): null | string {
  if (entry.type === 'chunk') {
    return entry.code;
  }
  if (!TEXT_ASSET_EXTENSIONS.has(extname(entry.fileName).toLowerCase())) {
    return null;
  }
  return typeof entry.source === 'string'
    ? entry.source
    : Buffer.from(entry.source).toString('utf8');
}

function validatePolicy(policy: ProductionBundlePolicy) {
  const ids = new Set<string>();
  for (const budget of policy.routeChunks) {
    if (ids.has(budget.id)) {
      throw new Error(`Duplicate route chunk budget id: ${budget.id}`);
    }
    ids.add(budget.id);
    if (
      !Number.isSafeInteger(budget.maxGzipBytes) ||
      budget.maxGzipBytes <= 0 ||
      !Number.isSafeInteger(budget.maxRawBytes) ||
      budget.maxRawBytes <= 0
    ) {
      throw new Error(`Invalid route chunk budget: ${budget.id}`);
    }
    if (!budget.moduleIdSuffix.startsWith('/')) {
      throw new Error(`Route module suffix must start with '/': ${budget.id}`);
    }
  }
  for (const { id, pattern } of policy.forbiddenPatterns) {
    if (pattern.global || pattern.sticky) {
      throw new Error(`Forbidden pattern must be stateless: ${id}`);
    }
  }
}

export {
  evaluateProductionBundle,
  OPERATOR_CONSOLE_BUNDLE_POLICY,
  productionBundlePolicyPlugin,
};
export type { BundleOutput, ProductionBundlePolicy };
