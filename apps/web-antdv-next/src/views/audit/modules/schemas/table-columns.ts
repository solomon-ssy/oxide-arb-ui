import type { ControlFactorAuditEventInfo } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import {
  ACTING_ROLE_COLORS,
  useAuditResourceTagOptions,
  useControlAuditEventTagOptions,
} from '#/shared/components/format/tag-options';

export function useAuditChainColumns(
  onActionClick: OnActionClickFn<ControlFactorAuditEventInfo>,
): VxeTableGridOptions<ControlFactorAuditEventInfo>['columns'] {
  return [
    { field: 'sequence', title: $t('page.audit.columns.sequence'), width: 90 },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'created_at',
      title: $t('page.audit.columns.createdAt'),
      width: 170,
    },
    {
      cellRender: {
        name: 'CellTag',
        options: useControlAuditEventTagOptions(),
      },
      field: 'event_type',
      title: $t('page.audit.columns.eventType'),
      width: 210,
    },
    {
      cellRender: {
        attrs: {
          colorField: 'actor_role',
          colorMap: ACTING_ROLE_COLORS,
          defaultColor: 'processing',
        },
        name: 'CellTag',
      },
      field: 'actor',
      minWidth: 130,
      title: $t('page.audit.columns.actor'),
    },
    {
      field: 'actor_role',
      minWidth: 130,
      title: $t('page.audit.columns.actorRole'),
    },
    {
      cellRender: { name: 'CellTag', options: useAuditResourceTagOptions() },
      field: 'resource_type',
      width: 160,
      title: $t('page.audit.columns.resourceType'),
    },
    {
      cellRender: { name: 'CellCopy' },
      field: 'resource_id',
      minWidth: 160,
      title: $t('page.audit.columns.resourceId'),
    },
    {
      field: 'reason',
      formatter: ({ row }: { row: ControlFactorAuditEventInfo }) => {
        const text =
          row.reason?.trim() || `${row.event_type} · ${row.resource_id}`;
        return text.length > 48 ? `${text.slice(0, 45)}…` : text;
      },
      minWidth: 220,
      title: $t('page.audit.columns.summary'),
    },
    {
      field: 'request_id',
      cellRender: { name: 'CellCopy' },
      minWidth: 150,
      title: $t('page.audit.columns.requestId'),
    },
    {
      align: 'right',
      cellRender: {
        attrs: { nameField: 'event_id', onClick: onActionClick },
        name: 'CellOperation',
        options: [{ code: 'detail', text: $t('page.audit.actions.detail') }],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.audit.columns.operation'),
      width: 100,
    },
  ];
}
