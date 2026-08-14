import { toRaw } from 'vue';

import { $t, $te } from '#/locales';

export interface PolicyJsonSchema {
  $defs?: Record<string, PolicyJsonSchema>;
  $ref?: string;
  additionalProperties?: boolean | PolicyJsonSchema;
  anyOf?: PolicyJsonSchema[];
  const?: unknown;
  default?: unknown;
  description?: string;
  enum?: unknown[];
  exclusiveMaximum?: number;
  exclusiveMinimum?: number;
  items?: PolicyJsonSchema;
  maxItems?: number;
  maxLength?: number;
  maximum?: number;
  minItems?: number;
  minLength?: number;
  minimum?: number;
  oneOf?: PolicyJsonSchema[];
  properties?: Record<string, PolicyJsonSchema>;
  required?: string[];
  title?: string;
  type?: string | string[];
  'x-format'?: string;
  'x-ui-visible'?: boolean;
}

export interface PolicyDiffEntry {
  after: unknown;
  before: unknown;
  path: string[];
}

export type PolicyClientValidationCode =
  | 'additional_property'
  | 'const'
  | 'enum'
  | 'exclusive_maximum'
  | 'exclusive_minimum'
  | 'max_items'
  | 'max_length'
  | 'maximum'
  | 'min_items'
  | 'min_length'
  | 'minimum'
  | 'required'
  | 'type'
  | 'union';

export interface PolicyClientValidationIssue {
  code: PolicyClientValidationCode;
  expected?: number | string;
  path: string[];
}

export function parsePolicyJsonSchema(value: unknown): null | PolicyJsonSchema {
  return isRecord(value) ? (value as PolicyJsonSchema) : null;
}

export function resolvePolicySchema(
  root: PolicyJsonSchema,
  schema: PolicyJsonSchema,
): PolicyJsonSchema {
  if (schema.$ref?.startsWith('#/$defs/')) {
    const key = schema.$ref.slice('#/$defs/'.length);
    return root.$defs?.[key]
      ? resolvePolicySchema(root, root.$defs[key])
      : schema;
  }
  const nonNull = schema.anyOf?.find(
    (candidate) => !schemaTypeIncludes(candidate, 'null'),
  );
  return nonNull ? resolvePolicySchema(root, nonNull) : schema;
}

export function policySchemaType(schema: PolicyJsonSchema): string | undefined {
  return Array.isArray(schema.type)
    ? schema.type.find((type) => type !== 'null')
    : schema.type;
}

export function runtimeFieldLabel(
  resource: string,
  pointer: string,
  fallback: string,
) {
  const scopedKey = runtimeTranslationKey(resource, pointer, 'label');
  if ($te(scopedKey)) {
    return $t(scopedKey);
  }
  return fallback;
}

export function runtimeFieldDescription(
  resource: string,
  pointer: string,
  fallback: string,
) {
  const scopedKey = runtimeTranslationKey(resource, pointer, 'description');
  if ($te(scopedKey)) {
    return $t(scopedKey);
  }
  return fallback;
}

export function runtimeGroupLabel(resource: string, group: string) {
  const scopedKey = `page.config.runtimeGroup.${resource}.${group.replaceAll('/', '.')}`;
  if ($te(scopedKey)) {
    return $t(scopedKey);
  }
  return group
    .split('/')
    .map((segment) => humanizePolicyName(segment))
    .join(' / ');
}

function runtimeTranslationKey(
  resource: string,
  pointer: string,
  suffix: 'description' | 'label',
) {
  return `page.config.runtimeField.${resource}.${pointer
    .split('/')
    .filter(Boolean)
    .join('.')}.${suffix}`;
}

function humanizePolicyName(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');
}

export function policyEnumValueLabel(value: unknown): string {
  const serialized = String(value);
  const translationKey = `page.config.enumValue.${serialized}`;
  return $te(translationKey) ? $t(translationKey) : serialized;
}

export function clonePolicyValue<T>(value: T): T {
  return structuredClone(toRaw(value));
}

export function collectPolicyDiff(
  before: unknown,
  after: unknown,
  path: string[] = [],
): PolicyDiffEntry[] {
  if (Object.is(before, after)) {
    return [];
  }
  if (isRecord(before) && isRecord(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    return [...keys].flatMap((key) =>
      collectPolicyDiff(before[key], after[key], [...path, key]),
    );
  }
  if (
    Array.isArray(before) &&
    Array.isArray(after) &&
    JSON.stringify(before) === JSON.stringify(after)
  ) {
    return [];
  }
  return [{ after, before, path }];
}

export function formatPolicyValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

export function validatePolicyValue(
  root: PolicyJsonSchema,
  schema: PolicyJsonSchema,
  value: unknown,
  path: string[] = [],
): PolicyClientValidationIssue[] {
  if (schema.$ref) {
    const resolved = resolvePolicySchema(root, schema);
    return resolved === schema
      ? []
      : validatePolicyValue(root, resolved, value, path);
  }
  if (value === null && schemaAllowsNull(schema)) return [];
  const variants = schema.oneOf ?? schema.anyOf;
  if (variants?.length) {
    const results = variants.map((variant) =>
      validatePolicyValue(root, variant, value, path),
    );
    if (results.some((issues) => issues.length === 0)) return [];
    return [{ code: 'union', path }];
  }
  if (schema.const !== undefined && !Object.is(value, schema.const)) {
    return [{ code: 'const', expected: String(schema.const), path }];
  }
  if (schema.enum && !schema.enum.some((entry) => Object.is(entry, value))) {
    return [{ code: 'enum', path }];
  }

  const type = policySchemaType(schema);
  if (type === 'object') {
    if (!isRecord(value)) return [{ code: 'type', expected: type, path }];
    const properties = schema.properties ?? {};
    const issues: PolicyClientValidationIssue[] = (
      schema.required ?? []
    ).flatMap((key) =>
      value[key] === undefined
        ? [{ code: 'required', path: [...path, key] }]
        : [],
    );
    for (const [key, propertySchema] of Object.entries(properties)) {
      if (value[key] !== undefined) {
        issues.push(
          ...validatePolicyValue(root, propertySchema, value[key], [
            ...path,
            key,
          ]),
        );
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in properties)) {
          issues.push({ code: 'additional_property', path: [...path, key] });
        }
      }
    }
    return issues;
  }
  if (type === 'array') {
    if (!Array.isArray(value)) return [{ code: 'type', expected: type, path }];
    const issues: PolicyClientValidationIssue[] = [];
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      issues.push({ code: 'min_items', expected: schema.minItems, path });
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      issues.push({ code: 'max_items', expected: schema.maxItems, path });
    }
    const itemSchema = schema.items;
    if (itemSchema) {
      value.forEach((item, index) => {
        issues.push(
          ...validatePolicyValue(root, itemSchema, item, [
            ...path,
            String(index),
          ]),
        );
      });
    }
    return issues;
  }
  if (type === 'boolean' && typeof value !== 'boolean') {
    return [{ code: 'type', expected: type, path }];
  }
  if (type === 'string') {
    if (typeof value !== 'string') {
      return [{ code: 'type', expected: type, path }];
    }
    const issues: PolicyClientValidationIssue[] = [];
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      issues.push({ code: 'min_length', expected: schema.minLength, path });
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      issues.push({ code: 'max_length', expected: schema.maxLength, path });
    }
    return issues;
  }
  if (type === 'integer' || type === 'number') {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      (type === 'integer' && !Number.isInteger(value))
    ) {
      return [{ code: 'type', expected: type, path }];
    }
    const issues: PolicyClientValidationIssue[] = [];
    if (schema.minimum !== undefined && value < schema.minimum) {
      issues.push({ code: 'minimum', expected: schema.minimum, path });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      issues.push({ code: 'maximum', expected: schema.maximum, path });
    }
    if (
      schema.exclusiveMinimum !== undefined &&
      value <= schema.exclusiveMinimum
    ) {
      issues.push({
        code: 'exclusive_minimum',
        expected: schema.exclusiveMinimum,
        path,
      });
    }
    if (
      schema.exclusiveMaximum !== undefined &&
      value >= schema.exclusiveMaximum
    ) {
      issues.push({
        code: 'exclusive_maximum',
        expected: schema.exclusiveMaximum,
        path,
      });
    }
    return issues;
  }
  return [];
}

function schemaAllowsNull(schema: PolicyJsonSchema) {
  if (schemaTypeIncludes(schema, 'null')) return true;
  return [...(schema.anyOf ?? []), ...(schema.oneOf ?? [])].some((variant) =>
    schemaTypeIncludes(variant, 'null'),
  );
}

function schemaTypeIncludes(schema: PolicyJsonSchema, expected: string) {
  return Array.isArray(schema.type)
    ? schema.type.includes(expected)
    : schema.type === expected;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
