import type {
  ActivateCalibrationArtifactRequest,
  CalibrationArtifactDetailView,
  CalibrationArtifactListQuery,
  CalibrationArtifactSummaryView,
  FitBiasTableRequest,
  FitModelCalibratorRequest,
  ModelCalibrationFitPreflightView,
  Paginated,
  ResearchJobView,
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
  export const calibrationFitPreflight = (modelVersionId: string) =>
    `/research/models/${modelVersionId}/calibration-fit-preflight`;
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
 * `POST /research/calibration-artifacts/{id}/activate` — activate the reviewed
 * calibration artifact. Config routing remains a separate governed workflow.
 */
export async function activateCalibrationArtifact(
  id: string,
  body: ActivateCalibrationArtifactRequest,
  ctx: GovernedContext,
) {
  return governedPost<CalibrationArtifactDetailView>(
    CalibrationApi.activateArtifact(id),
    body,
    ctx,
  );
}

/**
 * `GET /research/models/{id}/calibration-fit-preflight` — read-only
 * disjoint + embargo check, surfaced live as the operator picks a
 * model/dataset pair (never enqueues a job).
 */
export async function fetchCalibrationFitPreflight(
  modelVersionId: string,
  calibrationDatasetId: string,
) {
  return requestClient.get<ModelCalibrationFitPreflightView>(
    CalibrationApi.calibrationFitPreflight(modelVersionId),
    { params: { calibration_dataset_id: calibrationDatasetId } },
  );
}
