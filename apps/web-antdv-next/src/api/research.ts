import type {
  AcknowledgeFeatureParityLatchRequest,
  BacktestPathSetListQuery,
  BacktestPathSetView,
  BacktestReportListQuery,
  BacktestReportView,
  BindPublishPathSetRequest,
  BuildTrainingDatasetRequest,
  ComparisonReportListQuery,
  CreateModelSpecRequest,
  FactorCollinearityQuery,
  FactorCollinearityView,
  FactorDefinitionListQuery,
  FactorDefinitionView,
  FeatureContractView,
  FeatureIntegrityLatchView,
  FeatureIntegritySummaryView,
  FeatureParityEventListQuery,
  FeatureParityEventView,
  FeatureParityRunListQuery,
  FeatureParityRunView,
  ModelComparisonReportView,
  ModelPublishedCatalogQuery,
  ModelSpecListQuery,
  ModelVersionListQuery,
  Paginated,
  PublishedModelOptionView,
  PublishFactorRequest,
  PublishFactorsBatchRequest,
  PublishModelRequest,
  QualityGatePreviewQuery,
  QualityGateReportView,
  QuantModelSpecView,
  RegisterFactorDefinitionsRequest,
  ResearchJobListQuery,
  ResearchJobView,
  RetireFactorRequest,
  RetireModelRequest,
  RollbackModelRequest,
  RunBacktestRequest,
  RunCpcvBacktestRequest,
  RunFullFeatureParityRequest,
  TrainedModelView,
  TrainingDatasetListQuery,
  TrainingDatasetPlanView,
  TrainingDatasetView,
  TrainModelRequest,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { governedPost } from '#/api/governed-request';
import { requestClient } from '#/api/request';

async function readAllPages<T>(
  fetchPage: (page: number) => Promise<Paginated<T>>,
  page = 1,
  accumulated: T[] = [],
): Promise<T[]> {
  const result = await fetchPage(page);
  if (result.items.length === 0 && result.has_next) {
    throw new Error('catalog pagination returned an empty non-terminal page');
  }
  const items = [...accumulated, ...result.items];
  return result.has_next ? readAllPages(fetchPage, page + 1, items) : items;
}

export namespace ResearchApi {
  export const trainingDatasets = '/research/training-datasets';
  export const trainingDataset = (id: string) =>
    `/research/training-datasets/${id}`;
  export const planTrainingDataset = '/research/training-datasets/plan';
  export const buildTrainingDataset = '/research/training-datasets/build';
  export const models = '/research/models';
  export const publishedModelCatalog = '/research/models/published-catalog';
  export const modelSpecs = '/research/model-specs';
  export const featureContract = '/research/feature-contract';
  export const modelSpec = (id: string) => `/research/model-specs/${id}`;
  export const trainModel = '/research/models/train';
  export const model = (id: string) => `/research/models/${id}`;
  export const modelQualityGate = (id: string) =>
    `/research/models/${id}/quality-gate`;
  export const backtestModel = (id: string) =>
    `/research/models/${id}/backtest`;
  export const publishModel = (id: string) => `/research/models/${id}/publish`;
  export const bindPublishPathSet = (id: string) =>
    `/research/models/${id}/bind-publish-path-set`;
  export const rollbackModel = (id: string) =>
    `/research/models/${id}/rollback`;
  export const retireModel = (id: string) => `/research/models/${id}/retire`;
  export const backtestReports = '/research/backtest-reports';
  export const backtestReport = (id: string) =>
    `/research/backtest-reports/${id}`;
  export const backtestPathSets = '/research/backtest-path-sets';
  export const backtestPathSet = (id: string) =>
    `/research/backtest-path-sets/${id}`;
  export const cpcvBacktestModel = (id: string) =>
    `/research/models/${id}/cpcv-backtest`;
  export const comparisonReports = '/research/comparison-reports';
  export const comparisonReport = (id: string) =>
    `/research/comparison-reports/${id}`;
  export const factors = '/research/factors';
  export const registerFactors = '/research/factors/register';
  export const publishFactorsBatch = '/research/factors/publish-batch';
  export const factorCollinearity = '/research/factors/collinearity';
  export const factor = (id: string) => `/research/factors/${id}`;
  export const publishFactor = (id: string) =>
    `/research/factors/${id}/publish`;
  export const retireFactor = (id: string) => `/research/factors/${id}/retire`;
  export const jobs = '/research/jobs';
  export const job = (id: string) => `/research/jobs/${id}`;
  export const cancelJob = (id: string) => `/research/jobs/${id}/cancel`;
  export const retryJob = (id: string) => `/research/jobs/${id}/retry`;
  export const featureIntegritySummary = '/research/feature-integrity/summary';
  export const featureParityRuns = '/research/feature-integrity/runs';
  export const featureParityEvents = '/research/feature-integrity/events';
  export const runFullFeatureParity = '/research/feature-integrity/runs/full';
  export const acknowledgeFeatureParityLatch =
    '/research/feature-integrity/latch/acknowledge';
}

/** `GET /research/feature-contract` — active hash-bound model-input catalog. */
export async function getFeatureContract() {
  return requestClient.get<FeatureContractView>(ResearchApi.featureContract);
}

/** `GET /research/feature-integrity/summary` — latch, watermarks and latest runs. */
export async function getFeatureIntegritySummary() {
  return requestClient.get<FeatureIntegritySummaryView>(
    ResearchApi.featureIntegritySummary,
  );
}

/** `GET /research/feature-integrity/runs` — exact-replay run ledger. */
export async function listFeatureParityRuns(
  query: FeatureParityRunListQuery = {},
) {
  return requestClient.get<Paginated<FeatureParityRunView>>(
    ResearchApi.featureParityRuns,
    { params: query },
  );
}

/** `GET /research/feature-integrity/events` — stage-level comparison evidence. */
export async function listFeatureParityEvents(
  query: FeatureParityEventListQuery = {},
) {
  return requestClient.get<Paginated<FeatureParityEventView>>(
    ResearchApi.featureParityEvents,
    { params: query },
  );
}

/** `POST /research/feature-integrity/runs/full` — governed full replay enqueue. */
export async function runFullFeatureParity(
  body: RunFullFeatureParityRequest,
  ctx: GovernedContext,
) {
  return governedPost<ResearchJobView>(
    ResearchApi.runFullFeatureParity,
    body,
    ctx,
  );
}

/** `POST /research/feature-integrity/latch/acknowledge` — governed recovery. */
export async function acknowledgeFeatureParityLatch(
  body: AcknowledgeFeatureParityLatchRequest,
  ctx: GovernedContext,
) {
  return governedPost<FeatureIntegrityLatchView>(
    ResearchApi.acknowledgeFeatureParityLatch,
    body,
    ctx,
  );
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

/** Read the complete filtered dataset catalog for bounded selector workflows. */
export async function listAllTrainingDatasets(
  query: TrainingDatasetListQuery = {},
) {
  return readAllPages((page) =>
    listTrainingDatasets({ ...query, page, size: 100 }),
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

/** Read the complete filtered model-spec catalog for selector validation. */
export async function listAllModelSpecs(query: ModelSpecListQuery = {}) {
  return readAllPages((page) => listModelSpecs({ ...query, page, size: 100 }));
}

/** `GET /research/model-specs/{id}` — single model-spec row (detail drawer). */
export async function getModelSpec(id: string) {
  return requestClient.get<QuantModelSpecView>(ResearchApi.modelSpec(id));
}

/** `POST /research/model-specs` — governed model-spec authoring. */
export async function createModelSpec(
  body: CreateModelSpecRequest,
  ctx: GovernedContext,
) {
  return governedPost<QuantModelSpecView>(ResearchApi.modelSpecs, body, ctx);
}

/** `GET /research/models` — paginated trained-model registry catalog. */
export async function listModels(query: ModelVersionListQuery = {}) {
  return requestClient.get<Paginated<TrainedModelView>>(ResearchApi.models, {
    params: query,
  });
}

/** Read the complete filtered model-version catalog for selector workflows. */
export async function listAllModels(query: ModelVersionListQuery = {}) {
  return readAllPages((page) => listModels({ ...query, page, size: 100 }));
}

/** `GET /research/models/published-catalog` — the `ModelVersionSelect`
 * picker source: `Published`, side-and-category-eligible versions. */
export async function listPublishedModelOptions(
  query: ModelPublishedCatalogQuery,
) {
  return requestClient.get<PublishedModelOptionView[]>(
    ResearchApi.publishedModelCatalog,
    { params: query },
  );
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

/** Read the complete filtered factor catalog without relying on server clamping. */
export async function listAllFactors(query: FactorDefinitionListQuery = {}) {
  return readAllPages((page) => listFactors({ ...query, page, size: 100 }));
}

/** `GET /research/factors/{id}` — single factor definition (detail drawer). */
export async function getFactor(id: string) {
  return requestClient.get<FactorDefinitionView>(ResearchApi.factor(id));
}

/** `GET /research/factors/collinearity` — Spearman collinearity analysis. */
export async function getFactorCollinearity(
  query: FactorCollinearityQuery = {},
) {
  return requestClient.get<FactorCollinearityView>(
    ResearchApi.factorCollinearity,
    { params: query },
  );
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

/** `POST /research/training-datasets/build` — enqueue an async build job. */
export async function buildTrainingDataset(
  body: BuildTrainingDatasetRequest,
  ctx: GovernedContext,
) {
  return governedPost<ResearchJobView>(
    ResearchApi.buildTrainingDataset,
    body,
    ctx,
  );
}

/** `POST /research/models/train` — enqueue an async training job. */
export async function trainModel(
  body: TrainModelRequest,
  ctx: GovernedContext,
) {
  return governedPost<ResearchJobView>(ResearchApi.trainModel, body, ctx);
}

/** `GET /research/models/{id}` — trained model version. */
export async function getModel(id: string) {
  return requestClient.get<TrainedModelView>(ResearchApi.model(id));
}

/**
 * `GET /research/models/{id}/quality-gate` — read-only publish-readiness
 * dry-run. Runs the same gate as publish (no persistence) and returns the full
 * per-gate scorecard.
 */
export async function getModelQualityGate(
  id: string,
  query: QualityGatePreviewQuery = {},
) {
  return requestClient.get<QualityGateReportView>(
    ResearchApi.modelQualityGate(id),
    { params: query },
  );
}

/** `POST /research/models/{id}/backtest` — enqueue an async PIT backtest job. */
export async function backtestModel(
  id: string,
  body: RunBacktestRequest,
  ctx: GovernedContext,
) {
  return governedPost<ResearchJobView>(
    ResearchApi.backtestModel(id),
    body,
    ctx,
  );
}

/** `POST /research/models/{id}/cpcv-backtest` — enqueue async CPCV validation. */
export async function cpcvBacktestModel(
  id: string,
  body: RunCpcvBacktestRequest,
  ctx: GovernedContext,
) {
  return governedPost<ResearchJobView>(
    ResearchApi.cpcvBacktestModel(id),
    body,
    ctx,
  );
}

/** `GET /research/backtest-path-sets` — paginated CPCV path-set catalog. */
export async function listBacktestPathSets(
  query: BacktestPathSetListQuery = {},
) {
  return requestClient.get<Paginated<BacktestPathSetView>>(
    ResearchApi.backtestPathSets,
    { params: query },
  );
}

/** `GET /research/backtest-path-sets/{id}` — stored CPCV path set. */
export async function getBacktestPathSet(id: string) {
  return requestClient.get<BacktestPathSetView>(
    ResearchApi.backtestPathSet(id),
  );
}

/** `GET /research/jobs` — paginated research-job ledger (task center). */
export async function listResearchJobs(query: ResearchJobListQuery = {}) {
  return requestClient.get<Paginated<ResearchJobView>>(ResearchApi.jobs, {
    params: query,
  });
}

/** `GET /research/jobs/{id}` — single job (poll target). */
export async function getResearchJob(id: string) {
  return requestClient.get<ResearchJobView>(ResearchApi.job(id));
}

/** `POST /research/jobs/{id}/cancel` — governed cancel (queued→terminal, running→cooperative). */
export async function cancelResearchJob(id: string, ctx: GovernedContext) {
  return governedPost<ResearchJobView>(
    ResearchApi.cancelJob(id),
    { reason: ctx.reason },
    ctx,
  );
}

/** `POST /research/jobs/{id}/retry` — governed re-enqueue of a terminal job. */
export async function retryResearchJob(id: string, ctx: GovernedContext) {
  return governedPost<ResearchJobView>(
    ResearchApi.retryJob(id),
    { reason: ctx.reason },
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

/** `POST /research/models/{id}/bind-publish-path-set` — pin CPCV path set for publish gates. */
export async function bindPublishPathSet(
  id: string,
  body: BindPublishPathSetRequest,
  ctx: GovernedContext,
) {
  return governedPost<TrainedModelView>(
    ResearchApi.bindPublishPathSet(id),
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

/** `POST /research/factors/register` — governed register of enabled definitions. */
export async function registerFactorDefinitions(
  body: RegisterFactorDefinitionsRequest,
  ctx: GovernedContext,
) {
  return governedPost<FactorDefinitionView[]>(
    ResearchApi.registerFactors,
    body,
    ctx,
  );
}

/** `POST /research/factors/publish-batch` — governed batch publish. */
export async function publishFactorsBatch(
  body: PublishFactorsBatchRequest,
  ctx: GovernedContext,
) {
  return governedPost<FactorDefinitionView[]>(
    ResearchApi.publishFactorsBatch,
    body,
    ctx,
  );
}
