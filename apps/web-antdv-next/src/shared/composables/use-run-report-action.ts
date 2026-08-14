/**
 * Ad-hoc report run flow (dashboard quick action; reused by the 10.3 reports
 * page): an optional-parameter modal (top N / knowledge lag) chained into the
 * canonical governed-action modal (acting role + reason), then
 * `POST /quant/reports/run` (202 accepted — completion arrives over the
 * durable run drawer; `quant.report_run` only hints that the REST view changed.
 */
import type { ReportRunView } from '@vben/types';

import type { RunReportParams } from '#/shared/components/run-report-modal.vue';

import { useRouter } from 'vue-router';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'antdv-next';

import { runQuantReport } from '#/api/quant-reports';
import { $t } from '#/locales';
import RunReportModal from '#/shared/components/run-report-modal.vue';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';

export function useRunReportAction() {
  const router = useRouter();
  const { governed } = useGovernedAction();
  const { hasAccessByCodes } = useQpAccess();

  const canRun = hasAccessByCodes(['quant_report:enqueue']);

  const [RunReportModalHost, modalApi] = useVbenModal({
    connectedComponent: RunReportModal,
    destroyOnClose: true,
  });

  async function runWithParams(
    params: RunReportParams,
  ): Promise<null | ReportRunView> {
    // Caller-supplied idempotency key — required by `RunReportRequest` on the wire.
    const request_id = crypto.randomUUID();
    const accepted = await governed(
      (ctx) =>
        runQuantReport({ reason: ctx.reason, request_id, ...params }, ctx),
      {
        summary: $t('page.quantReports.run.governedSummary'),
        title: $t('page.quantReports.run.title'),
      },
    );
    if (accepted) {
      message.success(
        $t('page.quantReports.run.accepted', {
          id: accepted.report_run_id,
          key: accepted.trigger_key,
        }),
      );
      void router.push({
        path: '/trading/recommendations',
        query: {
          entity: 'report-run',
          id: accepted.report_run_id,
          module: 'reports',
        },
      });
    }
    return accepted;
  }

  function openRunReport() {
    modalApi
      .setData({
        onSubmit: (params: RunReportParams) => {
          void runWithParams(params);
        },
      })
      .open();
  }

  return { canRun, openRunReport, RunReportModalHost };
}
