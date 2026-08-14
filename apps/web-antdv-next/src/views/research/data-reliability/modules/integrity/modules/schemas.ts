import type { FeatureParityEventView, FeatureParityRunView } from '@vben/types';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import {
  FEATURE_PARITY_EVENT_STATUSES,
  FEATURE_PARITY_RUN_KINDS,
  FEATURE_PARITY_RUN_STATUSES,
  FEATURE_PARITY_STAGES,
} from '@vben/types';

import { $t } from '#/locales';
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
      align: 'right',
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
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(FEATURE_PARITY_RUN_KINDS).map((value) => ({
          label: $t(`enum.featureParityRunKind.${value}`),
          value,
        })),
      },
      fieldName: 'kind',
      label: $t('page.research.featureIntegrity.filters.kind'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(FEATURE_PARITY_RUN_STATUSES).map((value) => ({
          label: $t(`enum.featureParityRunStatus.${value}`),
          value,
        })),
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
      align: 'right',
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
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(FEATURE_PARITY_EVENT_STATUSES).map((value) => ({
          label: $t(`enum.featureParityEventStatus.${value}`),
          value,
        })),
      },
      fieldName: 'status',
      label: $t('page.research.featureIntegrity.filters.status'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(FEATURE_PARITY_STAGES).map((value) => ({
          label: $t(`enum.featureParityStage.${value}`),
          value,
        })),
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
