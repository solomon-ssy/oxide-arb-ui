import type { FeatureParityEventView, FeatureParityRunView } from '@vben/types';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import { enumOptions } from '#/shared/presentation/enum-options';
import { iconOp } from '#/shared/table/cell-operation-presets';

export function useParityRunColumns(
  onActionClick: OnActionClickFn<FeatureParityRunView>,
): VxeTableGridOptions<FeatureParityRunView>['columns'] {
  return [
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: FeatureParityRunView) =>
            `/research/data-reliability?module=feature-integrity&entity=parity-run&id=${row.parity_run_id}`,
        },
      },
      field: 'parity_run_id',
      minWidth: 160,
      title: $t('page.research.featureIntegrity.columns.runId'),
    },
    {
      cellRender: {
        name: 'CellEnumTag',
        props: { enum: 'FeatureParityRunKind' },
      },
      field: 'kind',
      title: $t('page.research.featureIntegrity.columns.kind'),
      width: 110,
    },
    {
      cellRender: {
        name: 'CellEnumTag',
        props: { enum: 'FeatureParityRunStatus' },
      },
      field: 'status',
      title: $t('page.research.featureIntegrity.columns.status'),
      width: 150,
    },
    {
      field: 'compared_count',
      formatter: ({ row }: { row: FeatureParityRunView }) =>
        `${row.compared_count} / ${row.total_count}`,
      title: $t('page.research.featureIntegrity.columns.compared'),
      width: 120,
    },
    {
      field: 'mismatched_count',
      title: $t('page.research.featureIntegrity.columns.mismatched'),
      width: 120,
    },
    {
      field: 'pending_materialization_count',
      title: $t('page.research.featureIntegrity.columns.pending'),
      width: 120,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'window_start',
      title: $t('page.research.featureIntegrity.columns.windowStart'),
      width: 170,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'window_end',
      title: $t('page.research.featureIntegrity.columns.windowEnd'),
      width: 170,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'finished_at',
      title: $t('page.research.featureIntegrity.columns.finishedAt'),
      width: 170,
    },
    {
      cellRender: {
        attrs: { nameField: 'parity_run_id', onClick: onActionClick },
        name: 'CellOperation',
        options: [
          iconOp<FeatureParityRunView>(
            'detail',
            $t('page.research.featureIntegrity.actions.detail'),
          ),
          iconOp<FeatureParityRunView>(
            'events',
            $t('page.research.featureIntegrity.actions.viewEvents'),
          ),
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.research.featureIntegrity.columns.operation'),
      width: 120,
    },
  ];
}

export function useParityRunSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'EnumSelect',
      componentProps: {
        allowClear: true,
        options: enumOptions('FeatureParityRunKind'),
      },
      fieldName: 'kind',
      label: $t('page.research.featureIntegrity.filters.kind'),
    },
    {
      component: 'EnumSelect',
      componentProps: {
        allowClear: true,
        options: enumOptions('FeatureParityRunStatus'),
      },
      fieldName: 'status',
      label: $t('page.research.featureIntegrity.filters.status'),
    },
    {
      component: 'RangePicker',
      componentProps: {
        allowClear: true,
        showTime: true,
        valueFormat: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
      },
      fieldName: 'range',
      label: $t('page.research.featureIntegrity.filters.createdAt'),
    },
  ];
}

export function useParityEventColumns(
  onActionClick: OnActionClickFn<FeatureParityEventView>,
): VxeTableGridOptions<FeatureParityEventView>['columns'] {
  return [
    {
      cellRender: {
        name: 'CellEnumTag',
        props: { enum: 'FeatureParityEventStatus' },
      },
      field: 'status',
      title: $t('page.research.featureIntegrity.columns.status'),
      width: 150,
    },
    {
      cellRender: {
        name: 'CellEnumTag',
        props: { enum: 'FeatureParityStage' },
      },
      field: 'stage',
      title: $t('page.research.featureIntegrity.columns.stage'),
      width: 180,
    },
    {
      field: 'feature_name',
      minWidth: 190,
      title: $t('page.research.featureIntegrity.columns.feature'),
    },
    {
      field: 'reason',
      minWidth: 220,
      title: $t('page.research.featureIntegrity.columns.reason'),
    },
    {
      field: 'market_id',
      minWidth: 150,
      title: $t('page.research.featureIntegrity.columns.market'),
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'decision_at',
      title: $t('page.research.featureIntegrity.columns.decisionAt'),
      width: 170,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'created_at',
      title: $t('page.research.featureIntegrity.columns.createdAt'),
      width: 170,
    },
    {
      cellRender: {
        attrs: { nameField: 'parity_event_id', onClick: onActionClick },
        name: 'CellOperation',
        options: [
          iconOp<FeatureParityEventView>(
            'detail',
            $t('page.research.featureIntegrity.actions.detail'),
          ),
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.research.featureIntegrity.columns.operation'),
      width: 80,
    },
  ];
}

export function useParityEventSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'parity_run_id',
      label: $t('page.research.featureIntegrity.filters.runId'),
    },
    {
      component: 'EnumSelect',
      componentProps: {
        allowClear: true,
        options: enumOptions('FeatureParityEventStatus'),
      },
      fieldName: 'status',
      label: $t('page.research.featureIntegrity.filters.status'),
    },
    {
      component: 'EnumSelect',
      componentProps: {
        allowClear: true,
        options: enumOptions('FeatureParityStage'),
      },
      fieldName: 'stage',
      label: $t('page.research.featureIntegrity.filters.stage'),
    },
    {
      component: 'Input',
      fieldName: 'feature_name',
      label: $t('page.research.featureIntegrity.filters.feature'),
    },
    {
      component: 'Input',
      fieldName: 'reason',
      label: $t('page.research.featureIntegrity.filters.reason'),
    },
  ];
}
