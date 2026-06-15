#!/usr/bin/env node
/**
 * Generate runtime_config/ui_catalog.rs from locale JSON + schema dump.
 *
 * Usage (from repo root):
 *   node oxide-arb-ui/scripts/generate-runtime-config-ui-catalog.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const enPath = path.resolve(
  __dirname,
  'fixtures/runtime-config-fields.en-US.json',
);
const zhPath = path.resolve(
  __dirname,
  'fixtures/runtime-config-fields.zh-CN.json',
);
const outPath = path.resolve(
  repoRoot,
  'crates/oxide-arb-models/src/runtime_config/ui_catalog.rs',
);

function flatten(tree, prefix = '') {
  const out = [];
  for (const [key, value] of Object.entries(tree)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (
      value &&
      typeof value === 'object' &&
      'label' in value &&
      'help' in value
    ) {
      out.push([next, value]);
    } else if (value && typeof value === 'object') {
      out.push(...flatten(value, next));
    }
  }
  return out;
}

function escapeRust(str) {
  return str.replaceAll('\\', '\\\\').replaceAll('"', String.raw`\"`);
}

function inferWidget(path) {
  if (path.includes('bot_token') || path.endsWith('.url')) {
    return 'Some(FieldWidget::SecretString)';
  }
  if (path === 'market_data.enabled_categories') {
    return 'Some(FieldWidget::EnumSet)';
  }
  if (path === 'detection.endgame.scorer.category_weights') {
    return 'Some(FieldWidget::EnumDecimalMap)';
  }
  if (
    path === 'risk.permanent_blacklist_markets' ||
    path === 'risk.permanent_blacklist_tokens'
  ) {
    return 'Some(FieldWidget::StringList)';
  }
  if (
    path.includes('all_sources_down_strategy') ||
    path.endsWith('.route') ||
    path.endsWith('.output_asset')
  ) {
    return 'Some(FieldWidget::EnumSelect)';
  }
  if (path.endsWith('_enabled')) return 'Some(FieldWidget::Boolean)';
  if (path.endsWith('_ms')) return 'Some(FieldWidget::DurationMs)';
  if (path.endsWith('_secs')) return 'Some(FieldWidget::Integer)';
  if (
    path.endsWith('_usd') ||
    path.endsWith('_pct') ||
    path.endsWith('_bps') ||
    path.includes('threshold') ||
    path.includes('weight') ||
    path.includes('alpha') ||
    path.includes('beta') ||
    path.includes('probability') ||
    path.includes('multiplier') ||
    path.includes('tolerance')
  ) {
    return 'Some(FieldWidget::DecimalString)';
  }
  return 'None';
}

function inferSemantics(path) {
  if (path === 'market_data.enabled_categories') {
    return 'Some(FieldSemantics::EmptyMeansAll)';
  }
  return 'None';
}

const dump = execSync(
  'cargo test -p oxide-arb-models dump_all_paths -- --ignored --nocapture 2>&1',
  { cwd: repoRoot, encoding: 'utf8' },
);

const descriptions = new Map();
for (const line of dump.split('\n')) {
  if (!line.includes('|') || line.startsWith(' ') || line.includes('Running'))
    continue;
  const pipeIndex = line.indexOf('|');
  if (pipeIndex <= 0) continue;
  const fieldPath = line.slice(0, pipeIndex).trim();
  const description = line.slice(pipeIndex + 1).trim();
  if (!fieldPath.includes('.')) continue;
  descriptions.set(fieldPath, description);
}

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
const enFlat = new Map(flatten(en));
const zhFlat = new Map(flatten(zh));

const entries = [];
let order = 0;
for (const fieldPath of descriptions.keys().toSorted()) {
  order += 10;
  const enEntry = enFlat.get(fieldPath);
  const zhEntry = zhFlat.get(fieldPath);
  const enLabel =
    enEntry?.label ??
    fieldPath.split('.').pop()?.replaceAll('_', ' ') ??
    fieldPath;
  const zhLabel = zhEntry?.label ?? enLabel;
  const enHelp = enEntry?.help ?? descriptions.get(fieldPath) ?? enLabel;
  const zhHelp = zhEntry?.help ?? enHelp;
  const visible = fieldPath === 'schema_version' ? 'false' : 'true';

  entries.push(`        FieldUiEntry {
            path: "${fieldPath}",
            label: ui_text!(en = "${escapeRust(enLabel)}", zh = "${escapeRust(zhLabel)}"),
            help: ui_text!(en = "${escapeRust(enHelp)}", zh = "${escapeRust(zhHelp)}"),
            order: ${order},
            widget: ${inferWidget(fieldPath)},
            semantics: ${inferSemantics(fieldPath)},
            visible: ${visible},
        },`);
}

/** Keep each generated helper under clippy's 100-line fn limit. */
const ENTRIES_PER_CHUNK = 5;
const chunks = [];
for (let index = 0; index < entries.length; index += ENTRIES_PER_CHUNK) {
  chunks.push(entries.slice(index, index + ENTRIES_PER_CHUNK));
}

const chunkFns = chunks.map((chunk, index) => [
  `fn build_fields_part_${index}() -> Vec<FieldUiEntry> {`,
  '    vec![',
  ...chunk,
  '    ]',
  '}',
  '',
]);

const buildFieldsBody = chunks
  .map((_, index) => `    out.extend(build_fields_part_${index}());`)
  .join('\n');

const lines = [
  '//! Generated field UI catalog — do not edit by hand.',
  '//! Regenerate: `node oxide-arb-ui/scripts/generate-runtime-config-ui-catalog.mjs`',
  '',
  'use crate::ui_text;',
  '',
  'use super::ui_registry::{field_catalog_lock, FieldUiEntry};',
  'use super::ui_widget::{FieldSemantics, FieldWidget};',
  '',
  '/// Lazily-built field UI catalog for preferences rendering.',
  '#[must_use]',
  "pub fn fields() -> &'static [FieldUiEntry] {",
  '    field_catalog_lock().get_or_init(build_fields)',
  '}',
  '',
  'fn build_fields() -> Vec<FieldUiEntry> {',
  `    let mut out = Vec::with_capacity(${entries.length});`,
  buildFieldsBody,
  '    out',
  '}',
  '',
  ...chunkFns.flat(),
];

fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`wrote ${outPath} (${entries.length} fields)`);
