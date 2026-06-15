import type {
  RuntimeConfigDocument,
  RuntimeConfigPatch,
  RuntimeConfigSchemaFieldView,
  RuntimeConfigSchemaView,
} from '@vben/types';

import type { RuntimeConfigFieldDiff, RuntimeConfigGroup } from './types';

import Decimal from 'decimal.js';

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

/** Group schema fields using server-provided group metadata and field order. */
export function groupRuntimeConfigFields(
  schema: RuntimeConfigSchemaView,
): RuntimeConfigGroup[] {
  const fieldsByGroup = new Map<string, RuntimeConfigSchemaFieldView[]>();
  for (const field of schema.fields) {
    const key = field.group || 'root';
    fieldsByGroup.set(key, [...(fieldsByGroup.get(key) ?? []), field]);
  }

  return schema.groups
    .toSorted(
      (left, right) =>
        left.order - right.order || left.id.localeCompare(right.id),
    )
    .map((group) => ({
      description: group.description ?? group.label,
      fields: (fieldsByGroup.get(group.id) ?? []).toSorted(
        (left, right) =>
          left.order - right.order || left.path.localeCompare(right.path),
      ),
      key: group.id,
      label: group.label,
      order: group.order,
    }));
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

/** Convert a field value into the editable control representation. */
export function fieldToInputValue(
  field: RuntimeConfigSchemaFieldView,
  value: unknown,
) {
  if (field.value_type === 'enum_array') {
    return normalizeEnumArrayWire(value ?? field.default ?? []);
  }
  if (field.value_type === 'string_array') {
    const source = value ?? field.default ?? [];
    return Array.isArray(source) ? source.map(String).filter(Boolean) : [];
  }
  if (field.value_type === 'enum_decimal_map') {
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
  if (field.value_type === 'enum_decimal_map') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`${field.path} must be an object`);
    }
    const allowed = new Set(schemaEnumValues(field));
    const out: Record<string, string> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (!allowed.has(key)) {
        throw new Error(`${field.path} contains unknown key: ${key}`);
      }
      const text = String(raw ?? '').trim();
      if (!text) {
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

/** Whether any diff touches a money-critical field. */
export function hasMoneyCriticalDiff(diffs: RuntimeConfigFieldDiff[]) {
  return diffs.some((diff) => diff.field.money_critical);
}
