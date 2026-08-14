import type { VbenFormSchema } from '#/adapter/form';

import { $t } from '#/locales';
import { enumOptions } from '#/shared/presentation/enum-options';

export interface IntentSearchInitialValues {
  approval_status?: string;
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
      fieldName: 'status',
      label: $t('page.quantIntents.filters.status'),
    },
    {
      component: 'EnumSelect',
      componentProps: {
        allowClear: true,
        options: enumOptions('ApprovalStatus'),
      },
      defaultValue: initial.approval_status,
      fieldName: 'approval_status',
      label: $t('page.quantIntents.filters.approvalStatus'),
    },
    {
      component: 'EnumSelect',
      componentProps: {
        allowClear: true,
        options: enumOptions('QuantRuntimeMode'),
      },
      fieldName: 'runtime_mode',
      label: $t('page.quantIntents.filters.runtimeMode'),
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
