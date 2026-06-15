/**
 * Seed list-page search forms from `?from=&to=` deep-link query params.
 */

import type { Dayjs } from 'dayjs';

import type { LocationQuery, Router } from 'vue-router';

import { useRoute } from 'vue-router';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

export interface RouteTimeWindowSeed {
  from: string;
  range: [Dayjs, Dayjs];
  to: string;
}

function parseQueryInstant(value: unknown): Dayjs | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.utc() : null;
}

/** Read a validated half-open window from route query (`from` + `to`). */
export function readRouteTimeWindow(
  query: LocationQuery,
): null | RouteTimeWindowSeed {
  const from = parseQueryInstant(query.from);
  const to = parseQueryInstant(query.to);
  if (!from || !to || !to.isAfter(from)) {
    return null;
  }
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    range: [from, to.subtract(1, 'millisecond')],
  };
}

/** Strip time-window keys from the current route (after the form has consumed them). */
export function clearRouteTimeWindow(router: Router, extraKeys: string[] = []) {
  const route = router.currentRoute.value;
  const strip = new Set(['from', 'to', ...extraKeys]);
  const nextQuery = Object.fromEntries(
    Object.entries(route.query).filter(([key]) => !strip.has(key)),
  );
  void router.replace({ path: route.path, query: nextQuery });
}

/** Convenience for pages that only need the seed once on mount. */
export function useRouteTimeWindowSeed() {
  const route = useRoute();
  return readRouteTimeWindow(route.query);
}
