import type { VbenFormSchema } from '#/adapter/form';

import {
  OPERATION_CATEGORIES,
  OPERATION_OUTCOMES,
  RESOURCE_TYPES,
} from '@vben/types';

import { $t } from '#/locales';

export interface OperationLogSearchInitialValues {
  category?: string;
  resource_type?: string;
}

export function useOperationLogSearchSchema(
  initial: OperationLogSearchInitialValues = {},
): VbenFormSchema[] {
  return [
    {
      component: 'RangePicker',
      componentProps: {
        allowClear: true,
        showTime: true,
        valueFormat: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
      },
      fieldName: 'occurred_at',
      label: $t('page.operationLog.search.occurredAt'),
    },
    {
      component: 'Input',
      componentProps: { allowClear: true },
      fieldName: 'actor_user_id',
      label: $t('page.operationLog.search.actorUserId'),
    },
    {
      component: 'Input',
      componentProps: { allowClear: true },
      fieldName: 'request_id',
      label: $t('page.operationLog.search.requestId'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(OPERATION_CATEGORIES).map((value) => ({
          label: $t(`enum.operationCategory.${value}`),
          value,
        })),
      },
      defaultValue: initial.category,
      fieldName: 'category',
      label: $t('page.operationLog.search.category'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(RESOURCE_TYPES).map((value) => ({
          label: $t(`enum.resourceType.${value}`),
          value,
        })),
      },
      defaultValue: initial.resource_type,
      fieldName: 'resource_type',
      label: $t('page.operationLog.search.resourceType'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(OPERATION_OUTCOMES).map((value) => ({
          label: $t(`enum.operationOutcome.${value}`),
          value,
        })),
      },
      fieldName: 'outcome',
      label: $t('page.operationLog.search.outcome'),
    },
  ];
}
