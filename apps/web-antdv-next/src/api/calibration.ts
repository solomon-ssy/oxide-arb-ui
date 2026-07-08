import type {
  ActivateCalibrationArtifactRequest,
  BindCalibrationRequest,
  CalibrationArtifactDetailView,
  CalibrationArtifactListQuery,
  CalibrationArtifactSummaryView,
  FitBiasTableRequest,
  FitModelCalibratorRequest,
  Paginated,
  ResearchJobView,
  RuntimeConfigVersionView,
  TrainedModelView,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { governedPost } from '#/api/governed-request';
import { requestClient } from '#/api/request';

export namespace CalibrationApi {
  export const artifacts = '/research/calibration-artifacts';
  export const artifact = (id: string) =>
    `/research/calibration-artifacts/${id}`;
  export const fitBiasTable = '/research/calibration-artifacts/fit-bias-table';
  export const fitModelCalibrator =
    '/research/calibration-artifacts/fit-model-calibrator';
  export const activateArtifact = (id: string) =>
    `/research/calibration-artifacts/${id}/activate`;
  export const bindCalibration = (modelVersionId: string) =>
    `/research/models/${modelVersionId}/bind-calibration`;
}

/** `GET /research/calibration-artifacts` — paginated calibration-artifact catalog. */
export async function listCalibrationArtifacts(
  query: CalibrationArtifactListQuery = {},
) {
  return requestClient.get<Paginated<CalibrationArtifactSummaryView>>(
    CalibrationApi.artifacts,
    { params: query },
  );
}

/** `GET /research/calibration-artifacts/{id}` — full artifact detail. */
export async function getCalibrationArtifact(id: string) {
  return requestClient.get<CalibrationArtifactDetailView>(
    CalibrationApi.artifact(id),
  );
}

/** `POST /research/calibration-artifacts/fit-bias-table` — enqueue bias-table fit. */
export async function fitBiasTable(
  body: FitBiasTableRequest,
  ctx: GovernedContext,
) {
  return governedPost<ResearchJobView>(CalibrationApi.fitBiasTable, body, ctx);
}

/** `POST /research/calibration-artifacts/fit-model-calibrator` — enqueue calibrator fit. */
export async function fitModelCalibrator(
  body: FitModelCalibratorRequest,
  ctx: GovernedContext,
) {
  return governedPost<ResearchJobView>(
    CalibrationApi.fitModelCalibrator,
    body,
    ctx,
  );
}

/**
 * `POST /research/calibration-artifacts/{id}/activate` — stage a runtime-config
 * version pinning a `market_price_bias` artifact as the favorite-longshot source.
 */
export async function activateCalibrationArtifact(
  id: string,
  body: ActivateCalibrationArtifactRequest,
  ctx: GovernedContext,
) {
  return governedPost<RuntimeConfigVersionView>(
    CalibrationApi.activateArtifact(id),
    body,
    ctx,
  );
}

/** `POST /research/models/{id}/bind-calibration` — bind a model-score calibrator. */
export async function bindCalibration(
  modelVersionId: string,
  body: BindCalibrationRequest,
  ctx: GovernedContext,
) {
  return governedPost<TrainedModelView>(
    CalibrationApi.bindCalibration(modelVersionId),
    body,
    ctx,
  );
}
