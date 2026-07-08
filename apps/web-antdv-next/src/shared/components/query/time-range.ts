import type { Dayjs } from 'dayjs';

/**
 * Shared `[from, to)` time-window filters for research governance list APIs.
 *
 * Backend contract (market linkages `derived_at`, basis alerts `as_of`):
 * - `from` — inclusive lower bound
 * - `to` — exclusive upper bound
 *
 * The RangePicker is **inclusive on both ends** for operators; this helper
 * converts the selected end instant to an exclusive `to` by advancing one
 * second (picker precision is whole seconds).
 */
import type { VbenFormSchema } from '#/adapter/form';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { $t } from '#/locales';

dayjs.extend(utc);

/** Vben form field storing a `[start, end]` Dayjs pair from `RangePicker`. */
export const TIME_RANGE_FIELD = 'timeRange';

type TimeRangeValue = [Dayjs, Dayjs] | null | undefined;

/** Search-form field wired to {@link TIME_RANGE_FIELD}. */
export function useTimeRangeSearchField(labelKey: string): VbenFormSchema {
  return {
    component: 'RangePicker',
    componentProps: {
      allowClear: true,
      format: 'YYYY-MM-DD HH:mm:ss',
      placeholder: [
        $t('page.research.common.timeRangeStart'),
        $t('page.research.common.timeRangeEnd'),
      ],
      showTime: { format: 'HH:mm:ss' },
      style: { width: '100%' },
    },
    fieldName: TIME_RANGE_FIELD,
    label: $t(labelKey),
  };
}

/** Map an inclusive UI range to API `from` / exclusive `to` ISO timestamps. */
export function timeRangeToQuery(value: TimeRangeValue): {
  from?: string;
  to?: string;
} {
  if (!value || value.length !== 2) {
    return {};
  }
  const [start, end] = value;
  if (!start?.isValid() || !end?.isValid()) {
    return {};
  }
  return {
    from: start.utc().toISOString(),
    // Inclusive end in the picker → exclusive upper bound for the API.
    to: end.utc().add(1, 'second').toISOString(),
  };
}

/** Extract `from` / `to` query params from grid search form values. */
export function timeRangeFromFormValues(formValues: Record<string, unknown>): {
  from?: string;
  to?: string;
} {
  return timeRangeToQuery(formValues[TIME_RANGE_FIELD] as TimeRangeValue);
}
