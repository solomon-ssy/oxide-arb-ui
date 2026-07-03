import type { VbenFormSchema } from '#/adapter/form';

import { RECONCILIATION_RESULTS } from '@vben/types';

import { $t } from '#/locales';

/** Prefilled filter values seeded from cross-page deep links (`route.query`). */
export interface ReconciliationInitialFilters {
  execution_order_id?: string;
  order_intent_id?: string;
}

/**
 * Reconciliation queue filters (AND-combined; `GET /quant/reconciliations`).
 * The `resolved` triage toggle on the page drives that flag separately.
 */
export function useReconciliationSearchSchema(
  initial: ReconciliationInitialFilters = {},
): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(RECONCILIATION_RESULTS).map((value) => ({
          label: $t(`enum.reconciliationResult.${value}`),
          value,
        })),
      },
      fieldName: 'result',
      label: $t('page.quantReconciliations.filters.result'),
    },
    {
      component: 'Input',
      componentProps: { allowClear: true },
      defaultValue: initial.execution_order_id,
      fieldName: 'execution_order_id',
      label: $t('page.quantReconciliations.filters.executionOrderId'),
    },
    {
      component: 'Input',
      componentProps: { allowClear: true },
      defaultValue: initial.order_intent_id,
      fieldName: 'order_intent_id',
      label: $t('page.quantReconciliations.filters.orderIntentId'),
    },
    {
      component: 'RangePicker',
      componentProps: {
        allowClear: true,
        showTime: true,
        valueFormat: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
      },
      fieldName: 'range',
      label: $t('page.quantReconciliations.filters.detectedAt'),
    },
  ];
}
