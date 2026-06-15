import type { RuntimeConfigVersionView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import { useRuntimeConfigVersionSourceTagOptions } from '#/shared/components/format/tag-options';

const ACTIVE_STATUS_OPTIONS = [
  {
    color: 'success',
    label: $t('page.runtimeConfig.columns.active'),
    value: 'active',
  },
  {
    color: 'default',
    label: $t('page.runtimeConfig.columns.inactive'),
    value: 'inactive',
  },
];

export type RuntimeConfigVersionRow = RuntimeConfigVersionView & {
  _activation_state?: 'active' | 'inactive';
};

/** Version catalog columns. */
export function useRuntimeConfigVersionColumns(
  onActionClick: OnActionClickFn<RuntimeConfigVersionView>,
  activeVersionId: null | string,
  canActivate: boolean,
  canRollback: boolean,
): VxeTableGridOptions<RuntimeConfigVersionRow>['columns'] {
  return [
    {
      field: 'runtime_config_version_id',
      formatter: ({ cellValue }: { cellValue: string }) =>
        `${cellValue.slice(0, 8)}…`,
      minWidth: 130,
      title: $t('page.runtimeConfig.columns.version'),
    },
    {
      cellRender: { name: 'CellTag', options: ACTIVE_STATUS_OPTIONS },
      field: '_activation_state',
      title: $t('page.runtimeConfig.columns.status'),
      width: 90,
    },
    {
      cellRender: {
        name: 'CellTag',
        options: useRuntimeConfigVersionSourceTagOptions(),
      },
      field: 'source',
      title: $t('page.runtimeConfig.columns.source'),
      width: 110,
    },
    {
      field: 'schema_version',
      title: $t('page.runtimeConfig.columns.schemaVersion'),
      width: 120,
    },
    {
      cellRender: { name: 'CellCopy' },
      field: 'config_hash',
      minWidth: 160,
      title: $t('page.runtimeConfig.columns.hash'),
    },
    {
      field: 'created_by',
      minWidth: 130,
      title: $t('page.runtimeConfig.columns.createdBy'),
    },
    {
      field: 'reason',
      minWidth: 220,
      title: $t('page.runtimeConfig.columns.reason'),
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'created_at',
      title: $t('page.runtimeConfig.columns.createdAt'),
      width: 170,
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'runtime_config_version_id',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          { code: 'detail', text: $t('page.runtimeConfig.actions.detail') },
          {
            code: 'activate',
            show: (row: RuntimeConfigVersionView) =>
              canActivate && row.runtime_config_version_id !== activeVersionId,
            text: $t('page.runtimeConfig.actions.activate'),
          },
          {
            code: 'rollback',
            show: (row: RuntimeConfigVersionView) =>
              canRollback && row.runtime_config_version_id !== activeVersionId,
            text: $t('page.runtimeConfig.actions.rollback'),
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.runtimeConfig.columns.operation'),
      width: 220,
    },
  ];
}
