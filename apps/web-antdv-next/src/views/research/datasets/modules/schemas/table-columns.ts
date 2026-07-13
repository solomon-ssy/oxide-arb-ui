import type { TrainingDatasetView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import { useTrainingDatasetStatusTagOptions } from '#/shared/components/format/tag-options';
import { iconOp } from '#/shared/table/cell-operation-presets';

import { canTrainDataset } from '../dataset-action-state';

export function useTrainingDatasetColumns(
  onActionClick: OnActionClickFn<TrainingDatasetView>,
  canTrain: boolean,
): VxeTableGridOptions<TrainingDatasetView>['columns'] {
  return [
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: TrainingDatasetView) =>
            `/research/datasets?open=${row.training_dataset_id}`,
        },
      },
      field: 'training_dataset_id',
      minWidth: 150,
      title: $t('page.research.datasets.columns.datasetId'),
    },
    {
      field: 'model_spec_id',
      minWidth: 140,
      showOverflow: 'tooltip',
      title: $t('page.research.datasets.columns.modelSpec'),
    },
    {
      cellRender: {
        name: 'CellTag',
        options: [
          {
            color: 'processing',
            label: $t('enum.datasetPurpose.training'),
            value: 'training',
          },
          {
            color: 'purple',
            label: $t('enum.datasetPurpose.calibration'),
            value: 'calibration',
          },
        ],
      },
      field: 'purpose',
      title: $t('page.research.datasets.columns.purpose'),
      width: 120,
    },
    {
      cellRender: {
        name: 'CellTag',
        options: useTrainingDatasetStatusTagOptions(),
      },
      field: 'status',
      title: $t('page.research.datasets.columns.status'),
      width: 130,
    },
    {
      align: 'right',
      field: 'sample_count',
      title: $t('page.research.datasets.columns.sampleCount'),
      width: 110,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'window_start',
      title: $t('page.research.datasets.columns.windowStart'),
      width: 170,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'window_end',
      title: $t('page.research.datasets.columns.windowEnd'),
      width: 170,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'created_at',
      title: $t('page.research.datasets.columns.createdAt'),
      width: 170,
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'training_dataset_id',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          iconOp<TrainingDatasetView>(
            'detail',
            $t('page.research.datasets.actions.detail'),
          ),
          iconOp<TrainingDatasetView>(
            'train',
            $t('page.research.datasets.actions.train'),
            { show: (row) => canTrainDataset(canTrain, row) },
          ),
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.research.datasets.columns.operation'),
      width: 96,
    },
  ];
}
