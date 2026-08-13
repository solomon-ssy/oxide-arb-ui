/**
 * Baseline-report picker for the report diff panel.
 *
 * Loads every *published* report of the same kind (paginated to completion,
 * excluding the report being viewed), sorted newest-first by `decision_at`, and picks
 * a sensible default baseline: the most recent report strictly older than the
 * current one (the "previous run"), falling back to the newest available.
 *
 * The diff is always computed as `baseline (older) -> this report (current)`, so
 * the picker owns only the baseline selection; direction lives in the panel.
 */
import type { QuantReportDetailView, QuantReportView } from '@vben/types';

import type { CompareOption } from './report-compare-baseline';

import { ref } from 'vue';

import { useRequestHandler } from '@vben/request/qp';

import { listQuantReports } from '#/api/quant-reports';
import { formatDateTimeLocal } from '#/shared/components/format';

import { defaultBaseline } from './report-compare-baseline';

const PAGE_SIZE = 50;
/** Safety bound on pagination (PAGE_SIZE * MAX_PAGES reports). */
const MAX_PAGES = 40;

function toOption(item: QuantReportView): CompareOption {
  return {
    decision_at: item.decision_at,
    label: `${formatDateTimeLocal(item.decision_at)} · ${item.recommendation_report_id.slice(0, 8)}`,
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
  async function load(
    current: QuantReportDetailView,
  ): Promise<string | undefined> {
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
            }),
          { silent: true },
        );
        if (!result) {
          break;
        }
        for (const item of result.items) {
          if (
            item.recommendation_report_id !==
              current.recommendation_report_id &&
            item.represented_routes.digest === current.represented_routes.digest
          ) {
            collected.push(toOption(item));
          }
        }
        if (!result.has_next) {
          break;
        }
      }
      // Newest-first by decision_at (ISO strings sort lexicographically).
      collected.sort((a, b) => b.decision_at.localeCompare(a.decision_at));
      options.value = collected;
      return defaultBaseline(
        collected,
        current.decision_at,
        current.predecessor_report_id ?? undefined,
      );
    } finally {
      loading.value = false;
    }
  }

  return { load, loading, options };
}
