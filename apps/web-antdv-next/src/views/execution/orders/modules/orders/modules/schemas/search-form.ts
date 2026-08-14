import type { VbenFormSchema } from '#/adapter/form';

import { EXECUTION_ORDER_PHASES, EXECUTION_ORDER_STATES } from '@vben/types';

import { $t } from '#/locales';

/** Prefilled filter values seeded from cross-page deep links (`route.query`). */
export interface ExecutionOrderInitialFilters {
  market_id?: string;
  order_intent_id?: string;
  state?: string;
  token_id?: string;
}

/**
 * Execution-order ledger filters (AND-combined; `GET /quant/execution-orders`).
 * Deep links from intent / position / market pages seed `defaultValue` so the
 * ledger lands pre-scoped yet still operator-clearable.
 */
export function useExecutionOrderSearchSchema(
  initial: ExecutionOrderInitialFilters = {},
): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(EXECUTION_ORDER_STATES).map((value) => ({
          label: $t(`enum.executionOrderState.${value}`),
          value,
        })),
      },
      defaultValue: initial.state,
      fieldName: 'state',
      label: $t('page.quantExecutionOrders.filters.state'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(EXECUTION_ORDER_PHASES).map((value) => ({
          label: $t(`enum.executionOrderPhase.${value}`),
          value,
        })),
      },
      fieldName: 'order_phase',
      label: $t('page.quantExecutionOrders.filters.phase'),
    },
    {
      component: 'Input',
      componentProps: { allowClear: true },
      defaultValue: initial.order_intent_id,
      fieldName: 'order_intent_id',
      label: $t('page.quantExecutionOrders.filters.orderIntentId'),
    },
    {
      component: 'Input',
      componentProps: { allowClear: true },
      defaultValue: initial.market_id,
      fieldName: 'market_id',
      label: $t('page.quantExecutionOrders.filters.marketId'),
    },
    {
      component: 'Input',
      componentProps: { allowClear: true },
      defaultValue: initial.token_id,
      fieldName: 'token_id',
      label: $t('page.quantExecutionOrders.filters.tokenId'),
    },
    {
      component: 'RangePicker',
      componentProps: {
        allowClear: true,
        showTime: true,
        valueFormat: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
      },
      fieldName: 'range',
      label: $t('page.quantExecutionOrders.filters.createdAt'),
    },
  ];
}
