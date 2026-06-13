/**
 * RangePicker → backend time-window query bridge.
 *
 * Search forms bind a `range` tuple (dayjs instances or ISO strings); the
 * backend expects RFC3339 `from` / `to` query params (`TimeRangeQuery`).
 */

interface IsoConvertible {
  toISOString?: () => string;
}

/** Convert a search form's `range` tuple into `from` / `to` params. */
export function rangeToWindow(values: Record<string, any>): {
  from?: string;
  to?: string;
} {
  const [from, to] = (values.range ?? []) as Array<
    IsoConvertible | string | undefined
  >;
  const toIso = (value: IsoConvertible | string | undefined) => {
    if (!value) {
      return undefined;
    }
    return typeof value === 'string'
      ? new Date(value).toISOString()
      : value.toISOString?.();
  };
  return { from: toIso(from), to: toIso(to) };
}
