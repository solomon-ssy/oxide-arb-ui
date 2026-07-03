import type { FactorDefinitionView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import {
  useFactorFamilyTagOptions,
  useFactorScopeTagOptions,
  usePublicationStatusTagOptions,
} from '#/shared/components/format/tag-options';
import { iconOp } from '#/shared/table/cell-operation-presets';

/** Row-action permission gates for factor governance. */
export interface FactorActionAccess {
  canPublish: boolean;
  canRetire: boolean;
}

export function useFactorDefinitionColumns(
  onActionClick: OnActionClickFn<FactorDefinitionView>,
  access: FactorActionAccess,
): VxeTableGridOptions<FactorDefinitionView>['columns'] {
  return [
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: FactorDefinitionView) =>
            `/research/factors?open=${row.factor_definition_id}`,
        },
      },
      field: 'factor_definition_id',
      minWidth: 150,
      title: $t('page.research.factors.columns.factorId'),
    },
    {
      field: 'name',
      minWidth: 160,
      showOverflow: 'tooltip',
      title: $t('page.research.factors.columns.name'),
    },
    {
      cellRender: { name: 'CellTag', options: useFactorFamilyTagOptions() },
      field: 'factor_family',
      title: $t('page.research.factors.columns.family'),
      width: 150,
    },
    {
      cellRender: { name: 'CellTag', options: useFactorScopeTagOptions() },
      field: 'scope',
      title: $t('page.research.factors.columns.scope'),
      width: 150,
    },
    {
      cellRender: {
        name: 'CellTag',
        options: usePublicationStatusTagOptions(),
      },
      field: 'status',
      title: $t('page.research.factors.columns.status'),
      width: 120,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'updated_at',
      title: $t('page.research.factors.columns.updatedAt'),
      width: 170,
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'factor_definition_id',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          iconOp<FactorDefinitionView>(
            'detail',
            $t('page.research.factors.actions.detail'),
          ),
          iconOp<FactorDefinitionView>(
            'publish',
            $t('page.research.factors.actions.publish'),
            {
              show: (row) =>
                access.canPublish && ['draft', 'retired'].includes(row.status),
            },
          ),
          iconOp<FactorDefinitionView>(
            'retire',
            $t('page.research.factors.actions.retire'),
            {
              danger: true,
              show: (row) => access.canRetire && row.status === 'published',
            },
          ),
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.research.factors.columns.operation'),
      width: 110,
    },
  ];
}
