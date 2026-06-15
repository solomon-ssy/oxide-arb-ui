export interface JsonDiffRow {
  next: unknown;
  path: string;
  previous: unknown;
  type: 'added' | 'changed' | 'removed';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function same(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** Flatten two JSON documents into path-level differences. */
export function diffJson(
  previous: unknown,
  next: unknown,
  prefix = '',
): JsonDiffRow[] {
  if (isObject(previous) && isObject(next)) {
    const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
    return [...keys].flatMap((key) =>
      diffJson(previous[key], next[key], prefix ? `${prefix}.${key}` : key),
    );
  }
  if (same(previous, next)) {
    return [];
  }
  let type: JsonDiffRow['type'];
  if (previous === undefined) {
    type = 'added';
  } else if (next === undefined) {
    type = 'removed';
  } else {
    type = 'changed';
  }
  return [
    {
      next,
      path: prefix,
      previous,
      type,
    },
  ];
}
