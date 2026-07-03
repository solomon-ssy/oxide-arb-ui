/**
 * Ad-hoc report run flow (dashboard quick action; reused by the 10.3 reports
 * page): an optional-parameter modal (top N / source delay) chained into the
 * canonical governed-action modal (acting role + reason), then
 * `POST /quant/reports/run` (202 accepted — completion arrives over the
 * `quant.report` WS channel).
 */
import type { RunReportAccepted } from '@vben/types';

import type { RunReportParams } from '#/shared/components/run-report-modal.vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'antdv-next';

import { runQuantReport } from '#/api/quant-reports';
import { $t } from '#/locales';
import RunReportModal from '#/shared/components/run-report-modal.vue';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';

export function useRunReportAction() {
  const { governed } = useGovernedAction();
  const { hasAccessByCodes } = useQpAccess();

  const canRun = hasAccessByCodes(['quant_report:enqueue']);

  const [RunReportModalHost, modalApi] = useVbenModal({
    connectedComponent: RunReportModal,
    destroyOnClose: true,
  });

  async function runWithParams(
    params: RunReportParams,
  ): Promise<null | RunReportAccepted> {
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
          id: accepted.request_id,
          key: accepted.trigger_key,
        }),
      );
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
