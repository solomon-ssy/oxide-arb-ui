import type { ControlFactorPublicationInfo } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import {
  usePublicationModeTagOptions,
  usePublicationStatusTagOptions,
} from '#/shared/components/format/tag-options';

export function usePublicationColumns(
  onActionClick: OnActionClickFn<ControlFactorPublicationInfo>,
  canRollback: boolean,
): VxeTableGridOptions<ControlFactorPublicationInfo>['columns'] {
  return [
    {
      field: 'publication_id',
      formatter: ({ cellValue }: { cellValue: string }) =>
        `${cellValue.slice(0, 8)}…`,
      minWidth: 130,
      title: $t('page.publications.columns.publicationId'),
    },
    {
      cellRender: { name: 'CellTag', options: usePublicationModeTagOptions() },
      field: 'mode',
      title: $t('page.publications.columns.mode'),
      width: 110,
    },
    {
      cellRender: {
        name: 'CellTag',
        options: usePublicationStatusTagOptions(),
      },
      field: 'status',
      title: $t('page.publications.columns.status'),
      width: 130,
    },
    {
      field: 'factor_ids',
      formatter: ({ cellValue }: { cellValue: string[] }) => cellValue.length,
      title: $t('page.publications.columns.factorCount'),
      width: 110,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'effective_from',
      title: $t('page.publications.columns.effectiveFrom'),
      width: 170,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'expires_at',
      title: $t('page.publications.columns.expiresAt'),
      width: 170,
    },
    {
      field: 'approved_by',
      minWidth: 130,
      title: $t('page.publications.columns.approvedBy'),
    },
    {
      align: 'right',
      cellRender: {
        attrs: { nameField: 'publication_id', onClick: onActionClick },
        name: 'CellOperation',
        options: [
          { code: 'detail', text: $t('page.publications.actions.detail') },
          {
            code: 'rollback',
            show: (row: ControlFactorPublicationInfo) =>
              canRollback && row.status === 'active',
            text: $t('page.publications.actions.rollback'),
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.publications.columns.operation'),
      width: 160,
    },
  ];
}
