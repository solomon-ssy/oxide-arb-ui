import type { VbenFormSchema } from '#/adapter/form';

import { POSITION_LEDGER_STATES } from '@vben/types';

import { $t } from '#/locales';

/** Prefilled filter values seeded from cross-page deep links (`route.query`). */
export interface PositionInitialFilters {
  market_id?: string;
  order_intent_id?: string;
  state?: string;
  token_id?: string;
}

/**
 * System-lot position filters (AND-combined; `GET /quant/positions`). Deep links
 * from intent / market pages seed `defaultValue` so the ledger lands pre-scoped.
 */
export function usePositionSearchSchema(
  initial: PositionInitialFilters = {},
): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(POSITION_LEDGER_STATES).map((value) => ({
          label: $t(`enum.positionLedgerState.${value}`),
          value,
        })),
      },
      defaultValue: initial.state,
      fieldName: 'state',
      label: $t('page.quantPositions.filters.state'),
    },
    {
      component: 'Input',
      componentProps: { allowClear: true },
      defaultValue: initial.order_intent_id,
      fieldName: 'order_intent_id',
      label: $t('page.quantPositions.filters.orderIntentId'),
    },
    {
      component: 'Input',
      componentProps: { allowClear: true },
      defaultValue: initial.market_id,
      fieldName: 'market_id',
      label: $t('page.quantPositions.filters.marketId'),
    },
    {
      component: 'Input',
      componentProps: { allowClear: true },
      defaultValue: initial.token_id,
      fieldName: 'token_id',
      label: $t('page.quantPositions.filters.tokenId'),
    },
    {
      component: 'RangePicker',
      componentProps: {
        allowClear: true,
        showTime: true,
        valueFormat: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
      },
      fieldName: 'range',
      label: $t('page.quantPositions.filters.openedAt'),
    },
  ];
}
