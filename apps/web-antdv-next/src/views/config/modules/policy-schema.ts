import { toRaw } from 'vue';

import { $t, $te, i18n } from '#/locales';

export interface PolicyJsonSchema {
  $defs?: Record<string, PolicyJsonSchema>;
  $ref?: string;
  additionalProperties?: boolean | PolicyJsonSchema;
  anyOf?: PolicyJsonSchema[];
  const?: unknown;
  default?: unknown;
  description?: string;
  enum?: unknown[];
  items?: PolicyJsonSchema;
  maximum?: number;
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

export function policyFieldLabel(name: string, schema: PolicyJsonSchema) {
  const translationKey = `page.config.policyField.${name}.label`;
  if ($te(translationKey)) {
    return $t(translationKey);
  }
  return schema.title && schema.title !== name
    ? schema.title
    : name
        .split('_')
        .map((part) =>
          part.length > 0 ? `${part[0]?.toUpperCase()}${part.slice(1)}` : part,
        )
        .join(' ');
}

export function policyFieldDescription(
  name: string,
  schema: PolicyJsonSchema,
): string | undefined {
  const translationKey = `page.config.policyField.${name}.description`;
  if ($te(translationKey)) {
    return $t(translationKey);
  }
  if (i18n.global.locale.value === 'zh-CN') {
    return undefined;
  }
  return schema.description
    ?.replaceAll('`', '')
    .replaceAll('**', '')
    .replaceAll(/\n+/g, ' ')
    .trim();
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

function schemaTypeIncludes(schema: PolicyJsonSchema, expected: string) {
  return Array.isArray(schema.type)
    ? schema.type.includes(expected)
    : schema.type === expected;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
