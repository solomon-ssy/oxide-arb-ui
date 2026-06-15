import { $t } from '#/locales';
import {
  MATERIALIZATION_RUN_KIND_COLOR,
  MATERIALIZATION_RUN_STATUS_COLOR,
} from '#/shared/components/materialization-run';

/** CellTag options for materialization run kinds. */
export function buildMaterializationRunKindTagOptions() {
  return Object.entries(MATERIALIZATION_RUN_KIND_COLOR).map(
    ([value, color]) => ({
      color,
      label: $t(`enum.materializationRunKind.${value}`),
      value,
    }),
  );
}

/** CellTag options for materialization run statuses. */
export function buildMaterializationRunStatusTagOptions() {
  return Object.entries(MATERIALIZATION_RUN_STATUS_COLOR).map(
    ([value, color]) => ({
      color,
      label: $t(`enum.materializationRunStatus.${value}`),
      value,
    }),
  );
}
