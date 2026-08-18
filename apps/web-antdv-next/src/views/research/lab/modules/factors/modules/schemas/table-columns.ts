import type { FactorDefinitionView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import { factorOpenPath } from '#/shared/routes/research-plane';
import { iconOp } from '#/shared/table/cell-operation-presets';

export function useFactorDefinitionColumns(
  onActionClick: OnActionClickFn<FactorDefinitionView>,
): VxeTableGridOptions<FactorDefinitionView>['columns'] {
  return [
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: FactorDefinitionView) =>
            factorOpenPath(row.factor_definition_id),
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
      cellRender: { name: 'CellEnumTag', props: { enum: 'FactorFamily' } },
      field: 'factor_family',
      title: $t('page.research.factors.columns.family'),
      width: 150,
    },
    {
      cellRender: {
        name: 'CellEnumTag',
        props: { enum: 'FactorDefinitionScope' },
      },
      field: 'scope',
      title: $t('page.research.factors.columns.scope'),
      width: 150,
    },
    {
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
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.research.factors.columns.operation'),
      width: 110,
    },
  ];
}
