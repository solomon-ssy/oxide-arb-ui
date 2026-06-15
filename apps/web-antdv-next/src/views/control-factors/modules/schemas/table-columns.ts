import type { ControlFactorValueInfo } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import {
  useControlFactorTypeTagOptions,
  useFactorStatusTagOptions,
} from '#/shared/components/format/tag-options';

export function useControlFactorColumns(
  onActionClick: OnActionClickFn<ControlFactorValueInfo>,
  canReject: boolean,
): VxeTableGridOptions<ControlFactorValueInfo>['columns'] {
  return [
    { align: 'left', title: '', type: 'checkbox', width: 48 },
    {
      field: 'factor_id',
      formatter: ({ cellValue }: { cellValue: string }) =>
        `${cellValue.slice(0, 8)}…`,
      minWidth: 120,
      title: $t('page.controlFactors.columns.factorId'),
    },
    {
      cellRender: {
        name: 'CellTag',
        options: useControlFactorTypeTagOptions(),
      },
      field: 'factor_type',
      title: $t('page.controlFactors.columns.factorType'),
      width: 160,
    },
    {
      cellRender: { name: 'CellTag', options: useFactorStatusTagOptions() },
      field: 'status',
      title: $t('page.controlFactors.columns.status'),
      width: 130,
    },
    {
      field: 'owner',
      minWidth: 120,
      title: $t('page.controlFactors.columns.owner'),
    },
    {
      field: 'payload_hash',
      formatter: ({ cellValue }: { cellValue: string }) =>
        `${cellValue.slice(0, 16)}…`,
      minWidth: 160,
      title: $t('page.controlFactors.columns.payloadHash'),
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'generated_at',
      title: $t('page.controlFactors.columns.generatedAt'),
      width: 170,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'expires_at',
      title: $t('page.controlFactors.columns.expiresAt'),
      width: 170,
    },
    {
      align: 'right',
      cellRender: {
        attrs: { nameField: 'factor_id', onClick: onActionClick },
        name: 'CellOperation',
        options: [
          { code: 'detail', text: $t('page.controlFactors.actions.detail') },
          {
            code: 'reject',
            show: (row: ControlFactorValueInfo) =>
              canReject && row.status === 'candidate',
            text: $t('page.controlFactors.actions.reject'),
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.controlFactors.columns.operation'),
      width: 150,
    },
  ];
}
