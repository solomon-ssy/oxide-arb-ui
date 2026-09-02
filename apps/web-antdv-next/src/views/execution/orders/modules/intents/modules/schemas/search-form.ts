import type { VbenFormSchema } from '#/adapter/form';

import { $t } from '#/locales';
import { enumOptions } from '#/shared/presentation/enum-options';

export interface IntentSearchInitialValues {
  status?: string;
}

/** Order-intent ledger filters (AND-combined; forwarded to `GET /quant/intents`). */
export function useIntentSearchSchema(
  initial: IntentSearchInitialValues = {},
): VbenFormSchema[] {
  return [
    {
      component: 'EnumSelect',
      componentProps: {
        allowClear: true,
        options: enumOptions('OrderIntentStatus'),
      },
      defaultValue: initial.status,
      fieldName: 'status',
      label: $t('page.quantIntents.filters.status'),
    },
    {
      component: 'Input',
      componentProps: { allowClear: true },
      fieldName: 'recommendation_id',
      label: $t('page.quantIntents.filters.recommendationId'),
    },
    {
      component: 'RangePicker',
      componentProps: {
        allowClear: true,
        showTime: true,
        valueFormat: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
      },
      fieldName: 'range',
      label: $t('page.quantIntents.filters.createdAt'),
    },
  ];
}
