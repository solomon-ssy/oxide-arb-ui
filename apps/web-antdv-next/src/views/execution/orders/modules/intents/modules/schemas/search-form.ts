import type { VbenFormSchema } from '#/adapter/form';

import {
  APPROVAL_STATUSES,
  ORDER_INTENT_STATUSES,
  QUANT_RUNTIME_MODES,
} from '@vben/types';

import { $t } from '#/locales';

export interface IntentSearchInitialValues {
  approval_status?: string;
}

/** Order-intent ledger filters (AND-combined; forwarded to `GET /quant/intents`). */
export function useIntentSearchSchema(
  initial: IntentSearchInitialValues = {},
): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(ORDER_INTENT_STATUSES).map((value) => ({
          label: $t(`enum.orderIntentStatus.${value}`),
          value,
        })),
      },
      fieldName: 'status',
      label: $t('page.quantIntents.filters.status'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(APPROVAL_STATUSES).map((value) => ({
          label: $t(`enum.approvalStatus.${value}`),
          value,
        })),
      },
      defaultValue: initial.approval_status,
      fieldName: 'approval_status',
      label: $t('page.quantIntents.filters.approvalStatus'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(QUANT_RUNTIME_MODES).map((value) => ({
          label: $t(`enum.quantRuntimeMode.${value}`),
          value,
        })),
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
