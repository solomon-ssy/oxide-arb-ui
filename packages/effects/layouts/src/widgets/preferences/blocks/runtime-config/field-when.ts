import type {
  FieldWhenView,
  RuntimeConfigDocument,
  RuntimeConfigSchemaFieldView,
  WhenEffect,
} from '@vben/types';

import { getPath } from './schema-mapper';

const STRUCTURAL_SHOW = new Set<WhenEffect>(['if', 'visible']);
const STRUCTURAL_HIDE = new Set<WhenEffect>(['if_not', 'invisible']);

function readValue(
  path: string,
  draft: Record<string, unknown>,
  config: RuntimeConfigDocument,
): unknown {
  if (Object.hasOwn(draft, path)) {
    return draft[path];
  }
  return getPath(config, path);
}

function looselyEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function compareValues(left: unknown, right: unknown): number | undefined {
  const leftNumber = toNumber(left);
  const rightNumber = toNumber(right);
  if (leftNumber !== undefined && rightNumber !== undefined) {
    return Math.sign(leftNumber - rightNumber);
  }
  const leftText =
    left === null || left === undefined ? undefined : String(left);
  const rightText =
    right === null || right === undefined ? undefined : String(right);
  if (leftText !== undefined && rightText !== undefined) {
    return leftText.localeCompare(rightText);
  }
  return undefined;
}

function inList(
  actual: unknown,
  expected: unknown,
  positive: boolean,
): boolean {
  let found = false;
  if (Array.isArray(expected)) {
    found = expected.some((item) => looselyEqual(actual, item));
  } else if (typeof expected === 'string') {
    found = expected
      .split(',')
      .map((part) => part.trim())
      .some((part) => looselyEqual(actual, part));
  }
  return positive ? found : !found;
}

function between(
  actual: unknown,
  expected: unknown,
  positive: boolean,
): boolean {
  if (!Array.isArray(expected) || expected.length !== 2) {
    return false;
  }
  const value = toNumber(actual);
  const min = toNumber(expected[0]);
  const max = toNumber(expected[1]);
  if (value === undefined || min === undefined || max === undefined) {
    return false;
  }
  const ok = value >= min && value <= max;
  return positive ? ok : !ok;
}

/** Evaluate one conditional rule against the current draft and live config. */
export function evaluateFieldWhen(
  rule: FieldWhenView,
  draft: Record<string, unknown>,
  config: RuntimeConfigDocument,
): boolean {
  const actual = readValue(rule.target_path, draft, config);
  switch (rule.operator) {
    case 'between': {
      return between(actual, rule.value, true);
    }
    case 'contains': {
      if (typeof actual === 'string' && typeof rule.value === 'string') {
        return actual.includes(rule.value);
      }
      if (Array.isArray(actual)) {
        return actual.some((item) => looselyEqual(item, rule.value));
      }
      return false;
    }
    case 'eq': {
      return looselyEqual(actual, rule.value);
    }
    case 'gt': {
      const cmp = compareValues(actual, rule.value);
      return cmp !== undefined && cmp > 0;
    }
    case 'gte': {
      const cmp = compareValues(actual, rule.value);
      return cmp !== undefined && cmp >= 0;
    }
    case 'lt': {
      const cmp = compareValues(actual, rule.value);
      return cmp !== undefined && cmp < 0;
    }
    case 'lte': {
      const cmp = compareValues(actual, rule.value);
      return cmp !== undefined && cmp <= 0;
    }
    case 'ne':
    case 'neq': {
      return !looselyEqual(actual, rule.value);
    }
    case 'not_between': {
      return between(actual, rule.value, false);
    }
    case 'not_in': {
      return inList(actual, rule.value, false);
    }
    case 'not_null': {
      return actual !== null && actual !== undefined;
    }
    case 'prefix': {
      return (
        typeof actual === 'string' &&
        typeof rule.value === 'string' &&
        actual.startsWith(rule.value)
      );
    }
    case 'regex': {
      if (typeof actual !== 'string' || typeof rule.value !== 'string') {
        return false;
      }
      try {
        return new RegExp(rule.value).test(actual);
      } catch {
        return false;
      }
    }
    case 'in': {
      return inList(actual, rule.value, true);
    }
    case 'suffix': {
      return (
        typeof actual === 'string' &&
        typeof rule.value === 'string' &&
        actual.endsWith(rule.value)
      );
    }
    default: {
      return true;
    }
  }
}

function matchingRules(
  field: RuntimeConfigSchemaFieldView,
  effects: WhenEffect[],
  draft: Record<string, unknown>,
  config: RuntimeConfigDocument,
): FieldWhenView[] {
  return (field.when ?? []).filter(
    (rule) =>
      effects.includes(rule.effect) && evaluateFieldWhen(rule, draft, config),
  );
}

/** Whether a field should render in the preferences form. */
export function isFieldVisible(
  field: RuntimeConfigSchemaFieldView,
  draft: Record<string, unknown>,
  config: RuntimeConfigDocument,
): boolean {
  const rules = field.when ?? [];
  if (rules.length === 0) {
    return true;
  }

  const showRules = rules.filter((rule) => STRUCTURAL_SHOW.has(rule.effect));
  const hideRules = rules.filter((rule) => STRUCTURAL_HIDE.has(rule.effect));

  if (
    showRules.length > 0 &&
    !showRules.every((rule) => evaluateFieldWhen(rule, draft, config))
  ) {
    return false;
  }
  if (hideRules.some((rule) => evaluateFieldWhen(rule, draft, config))) {
    return false;
  }
  return true;
}

/** Whether a visible field is interactive (not explicitly disabled). */
export function isFieldEnabled(
  field: RuntimeConfigSchemaFieldView,
  draft: Record<string, unknown>,
  config: RuntimeConfigDocument,
): boolean {
  if (!isFieldVisible(field, draft, config)) {
    return false;
  }
  if (matchingRules(field, ['disable'], draft, config).length > 0) {
    return false;
  }
  const enableRules = (field.when ?? []).filter(
    (rule) => rule.effect === 'enable',
  );
  if (enableRules.length > 0) {
    return enableRules.some((rule) => evaluateFieldWhen(rule, draft, config));
  }
  return true;
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

  let required = false;
  for (const rule of field.when ?? []) {
    if (!evaluateFieldWhen(rule, draft, config)) {
      continue;
    }
    if (rule.effect === 'require') {
      required = true;
    }
    if (rule.effect === 'optional') {
      required = false;
    }
  }
  return required;
}
