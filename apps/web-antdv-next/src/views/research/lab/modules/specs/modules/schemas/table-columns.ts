import type { QuantModelSpecView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import { iconOp } from '#/shared/table/cell-operation-presets';

export function useModelSpecColumns(
  onActionClick: OnActionClickFn<QuantModelSpecView>,
): VxeTableGridOptions<QuantModelSpecView>['columns'] {
  return [
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: QuantModelSpecView) =>
            `/research/lab?module=specs&entity=model-spec&id=${row.model_spec_id}`,
        },
      },
      field: 'model_spec_id',
      minWidth: 150,
      title: $t('page.research.modelSpecs.columns.specId'),
    },
    {
      field: 'name',
      minWidth: 180,
      showOverflow: 'tooltip',
      title: $t('page.research.modelSpecs.columns.name'),
    },
    {
      cellRender: { name: 'CellEnumTag', props: { enum: 'ModelFamily' } },
      field: 'model_family',
      minWidth: 170,
      title: $t('page.research.modelSpecs.columns.modelFamily'),
    },
    {
      field: 'thesis.summary',
      formatter: ({ row }) => row.thesis.summary,
      minWidth: 240,
      showOverflow: 'tooltip',
      title: $t('page.research.modelSpecs.columns.thesisSummary'),
    },
    {
      field: 'prediction_horizon_secs',
      formatter: ({ cellValue }) =>
        typeof cellValue === 'number' ? `${cellValue}s` : '—',
      title: $t('page.research.modelSpecs.columns.predictionHorizon'),
      width: 130,
    },
    {
      formatter: ({ row }) =>
        `${row.feature_schema_version} / ${row.label_schema_version}`,
      title: $t('page.research.modelSpecs.columns.schemaVersions'),
      width: 130,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'created_at',
      title: $t('page.research.modelSpecs.columns.createdAt'),
      width: 170,
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'name',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          iconOp<QuantModelSpecView>(
            'detail',
            $t('page.research.modelSpecs.actions.detail'),
          ),
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.research.modelSpecs.columns.operation'),
      width: 90,
    },
  ];
}
