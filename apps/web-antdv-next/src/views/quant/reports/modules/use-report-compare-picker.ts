/**
 * Baseline-report picker for the report diff panel.
 *
 * Loads every *published* report of the same kind (paginated to completion,
 * excluding the report being viewed), sorted newest-first by `as_of`, and picks
 * a sensible default baseline: the most recent report strictly older than the
 * current one (the "previous run"), falling back to the newest available.
 *
 * The diff is always computed as `baseline (older) -> this report (current)`, so
 * the picker owns only the baseline selection; direction lives in the panel.
 */
import type { QuantReportView } from '@vben/types';

import type { CompareOption } from './report-compare-baseline';

import { ref } from 'vue';

import { useRequestHandler } from '@vben/request/qp';
import { RECOMMENDATION_REPORT_STATUSES } from '@vben/types';

import { listQuantReports } from '#/api/quant-reports';
import { formatDateTimeLocal } from '#/shared/components/format';

import { defaultBaseline } from './report-compare-baseline';

const PAGE_SIZE = 50;
/** Safety bound on pagination (PAGE_SIZE * MAX_PAGES reports). */
const MAX_PAGES = 40;

function toOption(item: QuantReportView): CompareOption {
  return {
    as_of: item.as_of,
    label: `${formatDateTimeLocal(item.as_of)} · ${item.recommendation_report_id.slice(0, 8)}`,
    status: item.status,
    value: item.recommendation_report_id,
  };
}

export function useReportComparePicker() {
  const { handleRequest } = useRequestHandler();

  const options = ref<CompareOption[]>([]);
  const loading = ref(false);

  /**
   * Load all published baseline candidates for `current` and return the default
   * baseline value (or `undefined` when none exist).
   */
  async function load(current: QuantReportView): Promise<string | undefined> {
    loading.value = true;
    try {
      const collected: CompareOption[] = [];
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const result = await handleRequest(
          () =>
            listQuantReports({
              kind: current.report_kind,
              page,
              size: PAGE_SIZE,
              status: RECOMMENDATION_REPORT_STATUSES.published,
            }),
          { silent: true },
        );
        if (!result) {
          break;
        }
        for (const item of result.items) {
          if (
            item.recommendation_report_id !== current.recommendation_report_id
          ) {
            collected.push(toOption(item));
          }
        }
        if (!result.has_next) {
          break;
        }
      }
      // Newest-first by as_of (ISO strings sort lexicographically).
      collected.sort((a, b) => b.as_of.localeCompare(a.as_of));
      options.value = collected;
      return defaultBaseline(collected, current.as_of);
    } finally {
      loading.value = false;
    }
  }

  return { load, loading, options };
}
