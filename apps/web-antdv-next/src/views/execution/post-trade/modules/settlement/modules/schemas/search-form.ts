import type { VbenFormSchema } from '#/adapter/form';

import { $t } from '#/locales';
import { enumOptions } from '#/shared/presentation/enum-options';

/** Prefilled filter values seeded from cross-page deep links (`route.query`). */
export interface SettlementRedeemInitialFilters {
  market_id?: string;
}

/**
 * Settlement-redeem batch filters (AND-combined; `GET /quant/settlement-redeems`).
 */
export function useSettlementRedeemSearchSchema(
  initial: SettlementRedeemInitialFilters = {},
): VbenFormSchema[] {
  return [
    {
      component: 'EnumSelect',
      componentProps: {
        allowClear: true,
        options: enumOptions('SettlementCaseState'),
      },
      fieldName: 'state',
      label: $t('page.quantSettlementRedeems.filters.state'),
    },
    {
      component: 'Input',
      componentProps: { allowClear: true },
      defaultValue: initial.market_id,
      fieldName: 'market_id',
      label: $t('page.quantSettlementRedeems.filters.marketId'),
    },
    {
      component: 'RangePicker',
      componentProps: {
        allowClear: true,
        showTime: true,
        valueFormat: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
      },
      fieldName: 'range',
      label: $t('page.quantSettlementRedeems.filters.createdAt'),
    },
  ];
}
