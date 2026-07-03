/**
 * Reconciliation operator resolution — the single governed mutation on the
 * reconciliation plane. Routes through the shared governed modal with a typed
 * verdict (`result`) plus optional observed fill (`filled_shares` / `avg_price`)
 * and a mandatory reason; 403/409/422 fail-closed details surface unmodified.
 * On success the returned execution-recovery next-steps are surfaced so the
 * operator sees whether auto-execution remains blocked.
 */
import type {
  ReconciliationResult,
  ReconciliationView,
  ResolveReconciliationResponse,
} from '@vben/types';

import type { GovernedField } from '#/shared/composables/governed-field';
import type { GovernedDetailRow } from '#/shared/composables/use-governed-action';

import {
  isReconciliationOperatorResolvable,
  OPERATOR_RECONCILIATION_RESULTS,
} from '@vben/types';

import { message } from 'antdv-next';

import { resolveReconciliation } from '#/api/reconciliations';
import { $t } from '#/locales';
import { EMPTY_PLACEHOLDER, formatUsd } from '#/shared/components/format';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';

function resolveFields(): GovernedField[] {
  return [
    {
      kind: 'select',
      label: $t('page.quantReconciliations.resolve.result'),
      name: 'result',
      options: OPERATOR_RECONCILIATION_RESULTS.map((value) => ({
        label: $t(`enum.reconciliationResult.${value}`),
        value,
      })),
      required: true,
    },
    {
      help: $t('page.quantReconciliations.resolve.filledSharesHelp'),
      kind: 'shares',
      label: $t('page.quantReconciliations.resolve.filledShares'),
      name: 'filled_shares',
    },
    {
      kind: 'price',
      label: $t('page.quantReconciliations.resolve.avgPrice'),
      name: 'avg_price',
    },
  ];
}

function reconciliationPreview(
  reconciliation: ReconciliationView,
): GovernedDetailRow[] {
  return [
    {
      label: $t('page.quantReconciliations.columns.currentResult'),
      value: $t(`enum.reconciliationResult.${reconciliation.result}`),
    },
    {
      label: $t('page.quantReconciliations.columns.discrepancy'),
      value: reconciliation.discrepancy_usd
        ? formatUsd(reconciliation.discrepancy_usd)
        : EMPTY_PLACEHOLDER,
    },
    {
      label: $t('page.quantReconciliations.columns.executionOrderId'),
      mono: true,
      value: reconciliation.execution_order_id,
    },
  ];
}

export function useReconciliationActions(onResolved: () => void) {
  const { governed } = useGovernedAction();
  const { hasAccessByCodes } = useQpAccess();

  const canResolve = hasAccessByCodes(['reconciliation:resolve']);

  async function resolve(
    reconciliation: ReconciliationView,
  ): Promise<null | ResolveReconciliationResponse> {
    if (!isReconciliationOperatorResolvable(reconciliation)) {
      return null;
    }

    const id = reconciliation.reconciliation_id;
    const result = await governed(
      (ctx) =>
        resolveReconciliation(
          id,
          {
            avg_price: ctx.fields.avg_price,
            filled_shares: ctx.fields.filled_shares,
            reason: ctx.reason,
            result: ctx.fields.result as ReconciliationResult,
          },
          ctx,
        ),
      {
        danger: true,
        details: reconciliationPreview(reconciliation),
        fields: resolveFields(),
        summary: $t('page.quantReconciliations.resolve.summary', { id }),
        title: $t('page.quantReconciliations.resolve.title'),
      },
    );
    if (result) {
      message.success($t('page.quantReconciliations.feedback.resolved'));
      const steps = result.recovery.next_steps;
      if (steps.length > 0) {
        message.info(
          $t('page.quantReconciliations.feedback.nextSteps', {
            steps: steps.join('; '),
          }),
        );
      }
      onResolved();
    }
    return result;
  }

  return { canResolve, resolve };
}
