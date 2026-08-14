/**
 * Report-plane governed actions. `run` is delegated to the shared
 * {@link useRunReportAction} (dashboard + reports page share one flow); `revoke`
 * is a report-only governed mutation gated by `quant_report:revoke`.
 */
import type { QuantReportView } from '@vben/types';

import { message } from 'antdv-next';

import { revokeQuantReport } from '#/api/quant-reports';
import { $t } from '#/locales';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';

export function useReportActions(onRevoked: () => void) {
  const { governed } = useGovernedAction();
  const { hasAccessByCodes } = useQpAccess();

  const canRevoke = hasAccessByCodes(['quant_report:revoke']);

  async function revoke(
    report: Pick<QuantReportView, 'recommendation_report_id'>,
  ) {
    if (!canRevoke) {
      return;
    }
    const id = report.recommendation_report_id;
    const result = await governed(
      (ctx) => revokeQuantReport(id, { reason: ctx.reason }, ctx),
      {
        confirmWord: 'REVOKE',
        danger: true,
        summary: $t('page.quantReports.actions.revokeSummary', { id }),
        title: $t('page.quantReports.actions.revokeTitle'),
      },
    );
    if (result) {
      message.success($t('page.quantReports.feedback.revoked'));
      onRevoked();
    }
  }

  return { canRevoke, revoke };
}
