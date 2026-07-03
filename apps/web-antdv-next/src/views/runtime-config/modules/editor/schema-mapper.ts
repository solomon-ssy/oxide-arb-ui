import type {
  RuntimeConfigDocument,
  RuntimeConfigPatch,
  RuntimeConfigSchemaFieldView,
  RuntimeConfigSchemaView,
  SchemaNode,
  SchemaSection,
} from '@vben/types';

import type { RuntimeConfigFieldDiff, RuntimeConfigFieldIndex } from './types';

import { isProxy, toRaw } from 'vue';

import Decimal from 'decimal.js';

import { isFieldVisible } from './field-when';

/** Enum wire keys for one schema leaf (prefers server `enum_items`). */
export function schemaEnumValues(
  field: RuntimeConfigSchemaFieldView,
): string[] {
  if (field.enum_items?.length) {
    return field.enum_items.map((item) => String(item.key));
  }
  return (field.constraints?.enum_values ?? []).map(String);
}

/** Whether the field uses the generic JSON tree editor (unknown structure only). */
export function isGenericJsonLeaf(
  field: RuntimeConfigSchemaFieldView,
): boolean {
  return field.value_type === 'array' || field.value_type === 'object';
}

/** Normalize enum-array wire values for stable diffing (order-independent). */
export function normalizeEnumArrayWire(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return [...new Set(values.map(String))].toSorted();
}

/** Normalize enum→decimal map wire values for stable diffing. */
export function normalizeEnumDecimalMapWire(
  values: unknown,
): Record<string, string> {
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(
    values as Record<string, unknown>,
  )) {
    if (value === null || value === undefined || value === '') {
      continue;
    }
    try {
      out[key] = normalizeDecimalString(value);
    } catch {
      out[key] = String(value);
    }
  }
  return out;
}

/** Whether the field is a string-keyed decimal map leaf. */
export function isDecimalMapField(
  field: RuntimeConfigSchemaFieldView,
): boolean {
  return (
    field.value_type === 'enum_decimal_map' ||
    field.value_type === 'decimal_map'
  );
}

/** Sparse decimal maps omit unset keys (e.g. factor weights overlay). */
export function isSparseDecimalMapField(
  field: RuntimeConfigSchemaFieldView,
): boolean {
  return field.value_type === 'decimal_map' || field.widget === 'weight_map';
}

/** Whether the schema default is JSON null (optional wire field). */
export function isNullableField(field: RuntimeConfigSchemaFieldView): boolean {
  return field.default === null;
}

/** Normalize a decimal string to canonical wire form (no trailing zeros). */
export function normalizeDecimalString(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text) {
    return '';
  }
  return new Decimal(text).toString();
}

/** Index the normalized field dictionary by dotted path. */
export function buildFieldIndex(
  schema: RuntimeConfigSchemaView,
): RuntimeConfigFieldIndex {
  return new Map(schema.fields.map((field) => [field.path, field]));
}

/** Top-level layout sections (each rendered as one governed apply card). */
export function topSections(schema: RuntimeConfigSchemaView): SchemaSection[] {
  return schema.tree
    .filter((node): node is SchemaSection => node.kind === 'section')
    .toSorted((left, right) => left.order - right.order);
}

/** Sort a node's children by their display order. */
export function sortedChildren(children: SchemaNode[]): SchemaNode[] {
  return [...children].toSorted((left, right) => left.order - right.order);
}

/** Every field path referenced under a node (fields + all union-case children). */
export function collectFieldPaths(node: SchemaNode): string[] {
  switch (node.kind) {
    case 'field': {
      return [node.path];
    }
    case 'section': {
      return node.children.flatMap((child) => collectFieldPaths(child));
    }
    case 'union': {
      return node.cases.flatMap((unionCase) =>
        unionCase.children.flatMap((child) => collectFieldPaths(child)),
      );
    }
  }
}

/** Field views for every field under a node, in dictionary order. */
export function nodeFieldViews(
  node: SchemaNode,
  index: RuntimeConfigFieldIndex,
): RuntimeConfigSchemaFieldView[] {
  return collectFieldPaths(node)
    .map((path) => index.get(path))
    .filter(
      (field): field is RuntimeConfigSchemaFieldView => field !== undefined,
    );
}

/**
 * Field paths that are structurally active given the live union discriminators
 * (a field inside a union case is active only when its `case_value` matches the
 * discriminator value in the draft / config). `when` visibility is layered on
 * top by the renderer via `field-when`.
 */
export function structurallyActivePaths(
  node: SchemaNode,
  draft: Record<string, unknown>,
  config: RuntimeConfigDocument,
  out: Set<string> = new Set(),
): Set<string> {
  switch (node.kind) {
    case 'field': {
      out.add(node.path);
      break;
    }
    case 'section': {
      for (const child of node.children) {
        structurallyActivePaths(child, draft, config, out);
      }
      break;
    }
    case 'union': {
      const actual = Object.hasOwn(draft, node.discriminator)
        ? draft[node.discriminator]
        : getPath(config, node.discriminator);
      const active = node.cases.find(
        (unionCase) =>
          JSON.stringify(unionCase.case_value) === JSON.stringify(actual),
      );
      for (const child of active?.children ?? []) {
        structurallyActivePaths(child, draft, config, out);
      }
      break;
    }
  }
  return out;
}

/** Read a dotted path from a JSON object. */
export function getPath(document: unknown, path: string): unknown {
  let cursor = document;
  for (const segment of path.split('.')) {
    if (!cursor || typeof cursor !== 'object') {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

/** Deep clone a runtime-config JSON document. */
export function cloneDocument(
  document: RuntimeConfigDocument,
): RuntimeConfigDocument {
  return structuredClone(document ?? {}) as RuntimeConfigDocument;
}

/** Deep-clone JSON wire values (objects/arrays/primitives only). */
function cloneJsonWire<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => cloneJsonWire(item)) as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    out[key] = cloneJsonWire(entry);
  }
  return out as T;
}

/** Clone JSON wire values; unwrap Vue proxies, fall back for non-cloneable handles. */
function cloneWireJson<T>(value: T): T {
  const raw = toRaw(value);
  if (isProxy(raw)) {
    return cloneJsonWire(raw);
  }
  try {
    return structuredClone(raw);
  } catch {
    return cloneJsonWire(raw);
  }
}

/** Convert a field value into the editable control representation. */
export function fieldToInputValue(
  field: RuntimeConfigSchemaFieldView,
  value: unknown,
) {
  if (field.widget === 'schedule_list') {
    const source = value ?? field.default ?? [];
    return Array.isArray(source) ? cloneWireJson(source) : [];
  }
  if (field.value_type === 'enum_array') {
    return normalizeEnumArrayWire(value ?? field.default ?? []);
  }
  if (field.value_type === 'string_array') {
    const source = value ?? field.default ?? [];
    return Array.isArray(source) ? source.map(String).filter(Boolean) : [];
  }
  if (isDecimalMapField(field)) {
    const keys = schemaEnumValues(field);
    const source = normalizeEnumDecimalMapWire(value ?? field.default ?? {});
    const defaults = normalizeEnumDecimalMapWire(field.default ?? {});
    const out: Record<string, string> = {};
    for (const key of keys) {
      out[key] = source[key] ?? defaults[key] ?? '';
    }
    return out;
  }
  if (isGenericJsonLeaf(field)) {
    return value ?? field.default ?? null;
  }
  if (field.value_type === 'boolean') {
    return Boolean(value);
  }
  if (field.value_type === 'number' || field.format === 'integer') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }
  if (field.sensitive && (value === '***' || value === undefined)) {
    return '';
  }
  if (field.format === 'decimal') {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    try {
      return normalizeDecimalString(value);
    } catch {
      return String(value);
    }
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

/** Parse editable control value back into wire JSON. */
export function inputValueToField(
  field: RuntimeConfigSchemaFieldView,
  value: unknown,
) {
  if (
    field.sensitive &&
    (value === '' || value === null || value === undefined)
  ) {
    return undefined;
  }
  if (field.widget === 'schedule_list') {
    if (!Array.isArray(value)) {
      throw new TypeError(`${field.path} must be an array of schedules`);
    }
    return value;
  }
  if (field.value_type === 'boolean') {
    return Boolean(value);
  }
  if (field.value_type === 'enum') {
    return String(value ?? '');
  }
  if (field.value_type === 'enum_array') {
    if (!Array.isArray(value)) {
      throw new TypeError(`${field.path} must be an array`);
    }
    const allowed = new Set(schemaEnumValues(field));
    const selected = normalizeEnumArrayWire(value);
    for (const item of selected) {
      if (!allowed.has(item)) {
        throw new Error(`${field.path} contains invalid enum value: ${item}`);
      }
    }
    return selected;
  }
  if (field.value_type === 'string_array') {
    if (!Array.isArray(value)) {
      throw new TypeError(`${field.path} must be an array`);
    }
    const items = [
      ...new Set(
        value
          .map((item) => String(item).trim())
          .filter((item) => item.length > 0),
      ),
    ];
    if (field.constraints?.pattern) {
      const pattern = new RegExp(field.constraints.pattern);
      for (const item of items) {
        if (!pattern.test(item)) {
          throw new Error(`${field.path} contains invalid entry: ${item}`);
        }
      }
    }
    return items;
  }
  if (isDecimalMapField(field)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`${field.path} must be an object`);
    }
    const allowed = new Set(schemaEnumValues(field));
    const out: Record<string, string> = {};
    const sparse = isSparseDecimalMapField(field);
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (!allowed.has(key)) {
        throw new Error(`${field.path} contains unknown key: ${key}`);
      }
      const text = String(raw ?? '').trim();
      if (!text) {
        if (sparse) {
          continue;
        }
        throw new TypeError(`${field.path}.${key} must be a decimal string`);
      }
      out[key] = normalizeDecimalString(text);
    }
    return out;
  }
  if (isGenericJsonLeaf(field)) {
    if (field.value_type === 'array' && !Array.isArray(value)) {
      throw new Error(`${field.path} must be a JSON array`);
    }
    if (
      field.value_type === 'object' &&
      (!value || typeof value !== 'object' || Array.isArray(value))
    ) {
      throw new Error(`${field.path} must be a JSON object`);
    }
    return value;
  }
  if (field.value_type === 'number' || field.format === 'integer') {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new TypeError(`${field.path} must be a finite number`);
    }
    return parsed;
  }
  if (field.format === 'decimal') {
    const text = String(value ?? '').trim();
    if (!text) {
      throw new TypeError(`${field.path} must be a decimal string`);
    }
    try {
      return normalizeDecimalString(text);
    } catch {
      throw new TypeError(`${field.path} must be a decimal string`);
    }
  }
  const text = String(value ?? '').trim();
  if (!text && isNullableField(field)) {
    return null;
  }
  return text;
}

/** Round-trip a wire value through the edit controls to its canonical wire form. */
export function canonicalWireValue(
  field: RuntimeConfigSchemaFieldView,
  value: unknown,
): unknown {
  if (field.sensitive && (value === '***' || value === undefined)) {
    return undefined;
  }
  const input = fieldToInputValue(field, value);
  if (field.sensitive && input === '') {
    return undefined;
  }
  try {
    return inputValueToField(field, input);
  } catch {
    return value;
  }
}

/** Semantic equality for one schema leaf (ignores decimal formatting / null-empty). */
export function sameFieldValue(
  field: RuntimeConfigSchemaFieldView,
  left: unknown,
  right: unknown,
): boolean {
  const canonicalLeft = canonicalWireValue(field, left);
  const canonicalRight = canonicalWireValue(field, right);
  if (canonicalLeft === undefined && canonicalRight === undefined) {
    return true;
  }
  return JSON.stringify(canonicalLeft) === JSON.stringify(canonicalRight);
}

/** Build dirty diffs for one group draft (sensitive unchanged → omitted). */
export function buildDiffs(
  fields: RuntimeConfigSchemaFieldView[],
  current: RuntimeConfigDocument,
  draft: Record<string, unknown>,
) {
  const diffs: RuntimeConfigFieldDiff[] = [];
  for (const field of fields) {
    const previous = getPath(current, field.path);
    const raw = draft[field.path];
    if (field.sensitive && (raw === '' || raw === null || raw === undefined)) {
      continue;
    }
    const next = inputValueToField(field, raw);
    if (next === undefined) {
      continue;
    }
    if (!sameFieldValue(field, previous, next)) {
      diffs.push({ field, next, path: field.path, previous });
    }
  }
  return diffs;
}

/** Sparse patch for `POST /runtime-config/versions` — only dirty leaf paths. */
export function buildPatch(
  diffs: RuntimeConfigFieldDiff[],
): RuntimeConfigPatch {
  const patch: RuntimeConfigPatch = {};
  for (const diff of diffs) {
    patch[diff.path] = diff.next;
  }
  return patch;
}

/** Whether the field forces a danger confirmation on mutation. */
export function isGovernanceCriticalField(
  field: RuntimeConfigSchemaFieldView,
): boolean {
  return field.semantics === 'governance_critical';
}

/**
 * Whether a section header should show the governance-critical badge for the
 * live config (union/when aware). Does not require the section card to mount.
 */
export function sectionShowsGovernanceCritical(
  section: SchemaSection,
  fields: RuntimeConfigFieldIndex,
  config: RuntimeConfigDocument,
): boolean {
  const draft: Record<string, unknown> = {};
  const active = structurallyActivePaths(section, draft, config);
  return nodeFieldViews(section, fields).some(
    (field) =>
      active.has(field.path) &&
      isFieldVisible(field, draft, config) &&
      isGovernanceCriticalField(field),
  );
}

/** Whether any diff touches a governance-critical field. */
export function hasGovernanceCriticalDiff(diffs: RuntimeConfigFieldDiff[]) {
  return diffs.some((diff) => isGovernanceCriticalField(diff.field));
}

/** 24-column grid span for one layout node (fields honor `ui_props.col_span`). */
export const RUNTIME_CONFIG_GRID_COLUMNS = 24;

export function fieldGridSpan(
  field: RuntimeConfigSchemaFieldView | undefined,
): number {
  const span = field?.ui_props?.col_span;
  if (span === undefined || span === null) {
    return RUNTIME_CONFIG_GRID_COLUMNS;
  }
  return Math.min(RUNTIME_CONFIG_GRID_COLUMNS, Math.max(1, span));
}

export function nodeGridSpan(
  node: SchemaNode,
  fields: RuntimeConfigFieldIndex,
): number {
  if (node.kind === 'field') {
    return fieldGridSpan(fields.get(node.path));
  }
  return RUNTIME_CONFIG_GRID_COLUMNS;
}
