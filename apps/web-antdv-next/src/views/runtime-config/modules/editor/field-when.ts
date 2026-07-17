import type {
  FieldWhenView,
  RuntimeConfigDocument,
  RuntimeConfigSchemaFieldView,
} from '@vben/types';

import { getDocumentPath } from './document-path';

function readValue(
  path: string,
  draft: Record<string, unknown>,
  config: RuntimeConfigDocument,
): unknown {
  if (Object.hasOwn(draft, path)) {
    return draft[path];
  }
  return getDocumentPath(config, path);
}

function looselyEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** Evaluate one conditional rule against the current draft and live config. */
export function evaluateFieldWhen(
  rule: FieldWhenView,
  draft: Record<string, unknown>,
  config: RuntimeConfigDocument,
): boolean {
  const actual = readValue(rule.target_path, draft, config);
  switch (rule.operator) {
    case 'eq': {
      return looselyEqual(actual, rule.value);
    }
    case 'ne': {
      return !looselyEqual(actual, rule.value);
    }
    default: {
      return true;
    }
  }
}

/** Whether a field should render in the editor form (all `if` rules must match). */
export function isFieldVisible(
  field: RuntimeConfigSchemaFieldView,
  draft: Record<string, unknown>,
  config: RuntimeConfigDocument,
): boolean {
  return (field.when ?? [])
    .filter((rule) => rule.effect === 'if')
    .every((rule) => evaluateFieldWhen(rule, draft, config));
}

/** Whether a visible field must have a non-empty value before apply. */
export function isFieldRequired(
  field: RuntimeConfigSchemaFieldView,
  draft: Record<string, unknown>,
  config: RuntimeConfigDocument,
): boolean {
  if (!isFieldVisible(field, draft, config)) {
    return false;
  }
  return (field.when ?? [])
    .filter((rule) => rule.effect === 'require')
    .some((rule) => evaluateFieldWhen(rule, draft, config));
}
