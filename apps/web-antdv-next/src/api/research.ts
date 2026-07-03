import type {
  BacktestReportListQuery,
  BacktestReportView,
  BuildTrainingDatasetRequest,
  ComparisonReportListQuery,
  FactorDefinitionListQuery,
  FactorDefinitionView,
  ModelComparisonReportView,
  ModelSpecListQuery,
  ModelVersionListQuery,
  Paginated,
  PublishFactorRequest,
  PublishModelRequest,
  QuantModelSpecView,
  RetireFactorRequest,
  RetireModelRequest,
  RollbackModelRequest,
  RunBacktestRequest,
  TrainedModelView,
  TrainingDatasetListQuery,
  TrainingDatasetPlanView,
  TrainingDatasetView,
  TrainModelRequest,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { governedPost } from '#/api/governed-request';
import { requestClient } from '#/api/request';

export namespace ResearchApi {
  export const trainingDatasets = '/research/training-datasets';
  export const trainingDataset = (id: string) =>
    `/research/training-datasets/${id}`;
  export const planTrainingDataset = '/research/training-datasets/plan';
  export const buildTrainingDataset = '/research/training-datasets/build';
  export const models = '/research/models';
  export const modelSpecs = '/research/model-specs';
  export const trainModel = '/research/models/train';
  export const model = (id: string) => `/research/models/${id}`;
  export const backtestModel = (id: string) =>
    `/research/models/${id}/backtest`;
  export const publishModel = (id: string) => `/research/models/${id}/publish`;
  export const rollbackModel = (id: string) =>
    `/research/models/${id}/rollback`;
  export const retireModel = (id: string) => `/research/models/${id}/retire`;
  export const backtestReports = '/research/backtest-reports';
  export const backtestReport = (id: string) =>
    `/research/backtest-reports/${id}`;
  export const comparisonReports = '/research/comparison-reports';
  export const comparisonReport = (id: string) =>
    `/research/comparison-reports/${id}`;
  export const factors = '/research/factors';
  export const factor = (id: string) => `/research/factors/${id}`;
  export const publishFactor = (id: string) =>
    `/research/factors/${id}/publish`;
  export const retireFactor = (id: string) => `/research/factors/${id}/retire`;
}

/** `GET /research/training-datasets` — paginated dataset ledger catalog. */
export async function listTrainingDatasets(
  query: TrainingDatasetListQuery = {},
) {
  return requestClient.get<Paginated<TrainingDatasetView>>(
    ResearchApi.trainingDatasets,
    { params: query },
  );
}

/** `GET /research/training-datasets/{id}` — dataset ledger row. */
export async function getTrainingDataset(id: string) {
  return requestClient.get<TrainingDatasetView>(
    ResearchApi.trainingDataset(id),
  );
}

/** `GET /research/model-specs` — paginated model-spec catalog (selector source). */
export async function listModelSpecs(query: ModelSpecListQuery = {}) {
  return requestClient.get<Paginated<QuantModelSpecView>>(
    ResearchApi.modelSpecs,
    { params: query },
  );
}

/** `GET /research/models` — paginated trained-model registry catalog. */
export async function listModels(query: ModelVersionListQuery = {}) {
  return requestClient.get<Paginated<TrainedModelView>>(ResearchApi.models, {
    params: query,
  });
}

/** `GET /research/backtest-reports` — paginated backtest-report catalog. */
export async function listBacktestReports(query: BacktestReportListQuery = {}) {
  return requestClient.get<Paginated<BacktestReportView>>(
    ResearchApi.backtestReports,
    { params: query },
  );
}

/** `GET /research/comparison-reports` — paginated comparison-report catalog. */
export async function listComparisonReports(
  query: ComparisonReportListQuery = {},
) {
  return requestClient.get<Paginated<ModelComparisonReportView>>(
    ResearchApi.comparisonReports,
    { params: query },
  );
}

/** `GET /research/factors` — paginated factor-definition catalog. */
export async function listFactors(query: FactorDefinitionListQuery = {}) {
  return requestClient.get<Paginated<FactorDefinitionView>>(
    ResearchApi.factors,
    { params: query },
  );
}

/** `GET /research/factors/{id}` — single factor definition (detail drawer). */
export async function getFactor(id: string) {
  return requestClient.get<FactorDefinitionView>(ResearchApi.factor(id));
}

/** `POST /research/training-datasets/plan` — governed dry-run plan. */
export async function planTrainingDataset(
  body: BuildTrainingDatasetRequest,
  ctx: GovernedContext,
) {
  return governedPost<TrainingDatasetPlanView>(
    ResearchApi.planTrainingDataset,
    body,
    ctx,
  );
}

/** `POST /research/training-datasets/build` — governed dataset build. */
export async function buildTrainingDataset(
  body: BuildTrainingDatasetRequest,
  ctx: GovernedContext,
) {
  return governedPost<TrainingDatasetView>(
    ResearchApi.buildTrainingDataset,
    body,
    ctx,
  );
}

/** `POST /research/models/train` — governed model training. */
export async function trainModel(
  body: TrainModelRequest,
  ctx: GovernedContext,
) {
  return governedPost<TrainedModelView>(ResearchApi.trainModel, body, ctx);
}

/** `GET /research/models/{id}` — trained model version. */
export async function getModel(id: string) {
  return requestClient.get<TrainedModelView>(ResearchApi.model(id));
}

/** `POST /research/models/{id}/backtest` — governed PIT backtest. */
export async function backtestModel(
  id: string,
  body: RunBacktestRequest,
  ctx: GovernedContext,
) {
  return governedPost<BacktestReportView>(
    ResearchApi.backtestModel(id),
    body,
    ctx,
  );
}

/** `GET /research/backtest-reports/{id}` — backtest report. */
export async function getBacktestReport(id: string) {
  return requestClient.get<BacktestReportView>(ResearchApi.backtestReport(id));
}

/** `GET /research/comparison-reports/{id}` — model comparison report. */
export async function getComparisonReport(id: string) {
  return requestClient.get<ModelComparisonReportView>(
    ResearchApi.comparisonReport(id),
  );
}

/** `POST /research/models/{id}/publish` — governed model publish. */
export async function publishModel(
  id: string,
  body: PublishModelRequest,
  ctx: GovernedContext,
) {
  return governedPost<TrainedModelView>(
    ResearchApi.publishModel(id),
    body,
    ctx,
  );
}

/** `POST /research/models/{id}/rollback` — governed model rollback. */
export async function rollbackModel(
  id: string,
  body: RollbackModelRequest,
  ctx: GovernedContext,
) {
  return governedPost<TrainedModelView>(
    ResearchApi.rollbackModel(id),
    body,
    ctx,
  );
}

/** `POST /research/models/{id}/retire` — governed model retire. */
export async function retireModel(
  id: string,
  body: RetireModelRequest,
  ctx: GovernedContext,
) {
  return governedPost<TrainedModelView>(ResearchApi.retireModel(id), body, ctx);
}

/** `POST /research/factors/{id}/publish` — governed factor publish. */
export async function publishFactor(
  id: string,
  body: PublishFactorRequest,
  ctx: GovernedContext,
) {
  return governedPost<FactorDefinitionView>(
    ResearchApi.publishFactor(id),
    body,
    ctx,
  );
}

/** `POST /research/factors/{id}/retire` — governed factor retire. */
export async function retireFactor(
  id: string,
  body: RetireFactorRequest,
  ctx: GovernedContext,
) {
  return governedPost<FactorDefinitionView>(
    ResearchApi.retireFactor(id),
    body,
    ctx,
  );
}
