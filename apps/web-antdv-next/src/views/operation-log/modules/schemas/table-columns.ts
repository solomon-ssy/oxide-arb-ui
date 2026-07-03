import type { OperationLogView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import {
  useActingRoleTagOptions,
  useOperationCategoryTagOptions,
  useOperationOutcomeTagOptions,
  useResourceTypeTagOptions,
} from '#/shared/components/format/tag-options';
import { iconOp } from '#/shared/table/cell-operation-presets';

export function useOperationLogColumns(
  onActionClick: OnActionClickFn<OperationLogView>,
): VxeTableGridOptions<OperationLogView>['columns'] {
  return [
    {
      cellRender: { name: 'CellDateTime' },
      field: 'occurred_at',
      title: $t('page.operationLog.columns.occurredAt'),
      width: 170,
    },
    {
      field: 'actor_username',
      minWidth: 130,
      title: $t('page.operationLog.columns.actor'),
    },
    {
      cellRender: { name: 'CellTag', options: useActingRoleTagOptions() },
      field: 'acting_role',
      minWidth: 120,
      title: $t('page.operationLog.columns.actingRole'),
    },
    {
      cellRender: {
        name: 'CellTag',
        options: useOperationCategoryTagOptions(),
      },
      field: 'category',
      title: $t('page.operationLog.search.category'),
      width: 130,
    },
    {
      field: 'action',
      minWidth: 180,
      title: $t('page.operationLog.columns.action'),
    },
    {
      cellRender: { name: 'CellTag', options: useResourceTypeTagOptions() },
      field: 'resource_type',
      width: 150,
      title: $t('page.operationLog.columns.resourceType'),
    },
    {
      field: 'resource_id',
      minWidth: 150,
      title: $t('page.operationLog.columns.resourceId'),
    },
    {
      cellRender: { name: 'CellTag', options: useOperationOutcomeTagOptions() },
      field: 'outcome',
      title: $t('page.operationLog.columns.outcome'),
      width: 110,
    },
    {
      cellRender: { name: 'CellCopy' },
      field: 'request_id',
      minWidth: 150,
      title: $t('page.operationLog.columns.requestId'),
    },
    {
      align: 'right',
      cellRender: {
        attrs: { nameField: 'id', onClick: onActionClick },
        name: 'CellOperation',
        options: [iconOp('detail', $t('page.operationLog.actions.detail'))],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.operationLog.columns.operation'),
      width: 72,
    },
  ];
}
