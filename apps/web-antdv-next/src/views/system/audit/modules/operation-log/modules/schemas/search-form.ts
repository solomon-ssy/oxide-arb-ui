import type { VbenFormSchema } from '#/adapter/form';

import { $t } from '#/locales';
import { enumOptions } from '#/shared/presentation/enum-options';

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
      component: 'EnumSelect',
      componentProps: {
        allowClear: true,
        options: enumOptions('OperationCategory'),
      },
      defaultValue: initial.category,
      fieldName: 'category',
      label: $t('page.operationLog.search.category'),
    },
    {
      component: 'EnumSelect',
      componentProps: {
        allowClear: true,
        options: enumOptions('ResourceType'),
      },
      defaultValue: initial.resource_type,
      fieldName: 'resource_type',
      label: $t('page.operationLog.search.resourceType'),
    },
    {
      component: 'EnumSelect',
      componentProps: {
        allowClear: true,
        options: enumOptions('OperationOutcome'),
      },
      fieldName: 'outcome',
      label: $t('page.operationLog.search.outcome'),
    },
  ];
}
