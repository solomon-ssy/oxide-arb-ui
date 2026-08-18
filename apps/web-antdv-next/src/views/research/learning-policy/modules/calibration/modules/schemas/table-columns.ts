import type { CalibrationArtifactSummaryView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import { calibrationArtifactOpenPath } from '#/shared/routes/research-plane';
import { iconOp } from '#/shared/table/cell-operation-presets';

export interface CalibrationArtifactActionAccess {
  canActivate: boolean;
}

export function useCalibrationArtifactColumns(
  onActionClick: OnActionClickFn<CalibrationArtifactSummaryView>,
  access: CalibrationArtifactActionAccess,
): VxeTableGridOptions<CalibrationArtifactSummaryView>['columns'] {
  return [
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: CalibrationArtifactSummaryView) =>
            calibrationArtifactOpenPath(row.artifact_id),
        },
      },
      field: 'artifact_id',
      minWidth: 220,
      showOverflow: 'tooltip',
      title: $t('page.research.calibrationArtifacts.columns.artifactId'),
    },
    {
      cellRender: { name: 'CellCopy' },
      field: 'content_hash',
      minWidth: 160,
      title: $t('page.research.calibrationArtifacts.columns.contentHash'),
    },
    {
      cellRender: {
        name: 'CellTag',
        props: {
          options: [
            {
              color: 'blue',
              label: $t('enum.calibrationKind.model_score'),
              value: 'model_score',
            },
            {
              color: 'purple',
              label: $t('enum.calibrationKind.market_price_bias'),
              value: 'market_price_bias',
            },
          ],
        },
      },
      field: 'kind',
      title: $t('page.research.calibrationArtifacts.columns.kind'),
      width: 150,
    },
    {
      field: 'sample_count',
      title: $t('page.research.calibrationArtifacts.columns.sampleCount'),
      width: 110,
    },
    {
      cellRender: {
        name: 'CellTag',
        props: {
          options: [
            {
              color: 'success',
              label: $t('page.research.calibrationArtifacts.active.yes'),
              value: true,
            },
            {
              color: 'default',
              label: $t('page.research.calibrationArtifacts.active.no'),
              value: false,
            },
          ],
        },
      },
      field: 'active',
      title: $t('page.research.calibrationArtifacts.columns.active'),
      width: 90,
    },
    {
      field: 'fit_window_start',
      minWidth: 260,
      slots: { default: 'fit_window' },
      title: $t('page.research.calibrationArtifacts.columns.fitWindow'),
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'created_at',
      title: $t('page.research.calibrationArtifacts.columns.createdAt'),
      width: 180,
    },
    {
      cellRender: {
        attrs: { nameField: 'artifact_id', onClick: onActionClick },
        name: 'CellOperation',
        options: [
          iconOp<CalibrationArtifactSummaryView>(
            'detail',
            $t('page.research.calibrationArtifacts.actions.detail'),
          ),
          iconOp<CalibrationArtifactSummaryView>(
            'activate',
            $t('page.research.calibrationArtifacts.actions.activate'),
            {
              show: (row) =>
                access.canActivate && row.kind === 'market_price_bias',
            },
          ),
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.research.calibrationArtifacts.columns.operation'),
      width: 160,
    },
  ];
}
