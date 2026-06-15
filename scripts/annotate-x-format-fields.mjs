#!/usr/bin/env node
/**
 * Insert `#[schemars(extend("x-format" = ...))]` on runtime-config numeric leaves
 * that do not already carry an explicit format.
 *
 * Usage (repo root):
 *   node oxide-arb-ui/scripts/annotate-x-format-fields.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const runtimeConfigDir = path.join(
  repoRoot,
  'crates/oxide-arb-models/src/runtime_config',
);

const DURATION_MS = new Set([
  'coalesce_window_ms',
  'dispatcher_timeout_ms',
  'max_book_to_order_ms',
  'min_dispatch_interval_ms',
  'staleness_acceptable_ms',
  'staleness_expired_ms',
  'staleness_fresh_ms',
  'staleness_stale_ms',
]);

const SKIP_FIELDS = new Set([
  'all_sources_down_strategy',
  'bot_token',
  'category_weights',
  'chat_id',
  'enabled',
  'enabled_categories',
  'holder_address',
  'output_asset',
  'permanent_blacklist_markets',
  'permanent_blacklist_tokens',
  'proxy_safe_address',
  'route',
  'schema_version',
  'uma_endpoint',
  'url',
]);

const INTEGER_TYPES = /:\s*(u8|u16|u32|u64|usize|i32)\s*,?\s*$/;

function formatForField(name) {
  if (SKIP_FIELDS.has(name)) {
    return null;
  }
  if (name.endsWith('_ms') || DURATION_MS.has(name)) {
    return 'duration_ms';
  }
  if (
    name.endsWith('_secs') ||
    name.endsWith('_hours') ||
    name.endsWith('_count') ||
    name.endsWith('_attempts') ||
    name.endsWith('_quorum') ||
    name.endsWith('_probes') ||
    name.endsWith('_budget') ||
    name.endsWith('_misses') ||
    name.endsWith('_failures') ||
    name.endsWith('_capacity') ||
    name.endsWith('_size') ||
    name.endsWith('_positions') ||
    name.endsWith('_directional') ||
    name.endsWith('_samples') ||
    name.endsWith('_strength') ||
    name === 'min_calibration_samples' ||
    name === 'voting_quorum' ||
    name === 'schema_version'
  ) {
    return 'integer';
  }
  return null;
}

function annotateFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  const lines = original.split('\n');
  const out = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^\s*pub\s+(\w+):\s/);
    if (!match) {
      out.push(line);
      continue;
    }

    const fieldName = match[1];
    const format = formatForField(fieldName);
    if (!format) {
      out.push(line);
      continue;
    }

    if (!INTEGER_TYPES.test(line)) {
      out.push(line);
      continue;
    }

    let cursor = index - 1;
    let hasSchemars = false;
    let hasFormat = false;
    while (cursor >= 0 && lines[cursor].trim().startsWith('#[')) {
      if (lines[cursor].includes('x-format')) {
        hasFormat = true;
      }
      if (lines[cursor].includes('#[')) {
        hasSchemars = true;
      }
      cursor -= 1;
    }

    if (hasFormat) {
      out.push(line);
      continue;
    }

    if (hasSchemars) {
      const prev = out[out.length - 1];
      if (prev.includes('extend(') && !prev.includes('x-format')) {
        out[out.length - 1] = prev.replace(
          'extend(',
          `extend("x-format" = "${format}", `,
        );
      } else {
        out.push(`    #[schemars(extend("x-format" = "${format}"))]`);
      }
    } else {
      out.push(`    #[schemars(extend("x-format" = "${format}"))]`);
    }
    out.push(line);
  }

  const next = out.join('\n');
  if (next !== original) {
    fs.writeFileSync(filePath, next);
    console.log(`updated ${path.relative(repoRoot, filePath)}`);
  }
}

for (const file of [
  'detection.rs',
  'execution.rs',
  'market_data.rs',
  'risk.rs',
  'settlement.rs',
  'notification.rs',
  '../runtime_config/mod.rs',
].map((relative) =>
  path.join(runtimeConfigDir, relative.replace('../runtime_config/', '')),
)) {
  if (fs.existsSync(file)) {
    annotateFile(file);
  }
}
