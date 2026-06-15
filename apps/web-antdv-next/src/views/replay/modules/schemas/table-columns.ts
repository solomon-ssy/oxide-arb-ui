import type { ControlFactorMaterializationRunView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';

import {
  buildMaterializationRunKindTagOptions,
  buildMaterializationRunStatusTagOptions,
} from './materialization-run-columns';

/** Paginated run list columns for `/replay`. */
export function useReplayRunColumns(
  onActionClick: OnActionClickFn<ControlFactorMaterializationRunView>,
): VxeTableGridOptions<ControlFactorMaterializationRunView>['columns'] {
  return [
    {
      cellRender: { name: 'CellDateTime' },
      field: 'created_at',
      title: $t('page.replay.columns.createdAt'),
      width: 170,
    },
    {
      field: 'materialization_run_id',
      formatter: ({ cellValue }: { cellValue: string }) =>
        `${cellValue.slice(0, 8)}…`,
      minWidth: 120,
      title: $t('page.replay.columns.runId'),
    },
    {
      cellRender: {
        name: 'CellTag',
        options: buildMaterializationRunKindTagOptions(),
      },
      field: 'run_kind',
      title: $t('page.replay.columns.runKind'),
      width: 110,
    },
    {
      cellRender: {
        name: 'CellTag',
        options: buildMaterializationRunStatusTagOptions(),
      },
      field: 'status',
      title: $t('page.replay.columns.status'),
      width: 130,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'window_from',
      title: $t('page.replay.columns.windowFrom'),
      width: 170,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'window_to',
      title: $t('page.replay.columns.windowTo'),
      width: 170,
    },
    {
      field: 'created_by',
      minWidth: 120,
      title: $t('page.replay.columns.createdBy'),
    },
    {
      align: 'right',
      cellRender: {
        attrs: { nameField: 'materialization_run_id', onClick: onActionClick },
        name: 'CellOperation',
        options: [{ code: 'detail', text: $t('page.replay.actions.detail') }],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.replay.columns.operation'),
      width: 100,
    },
  ];
}

export { useReplaySearchSchema } from './search-form';
