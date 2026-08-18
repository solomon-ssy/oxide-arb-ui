/** Canonical workspace deep links for the research plane. */

function researchEntityPath(
  workspace:
    | '/research/data-reliability'
    | '/research/lab'
    | '/research/learning-policy',
  module: string,
  entity: string,
  id: string,
): string {
  const search = new URLSearchParams();
  search.set('module', module);
  search.set('entity', entity);
  search.set('id', id);
  return `${workspace}?${search.toString()}`;
}

export function modelSpecOpenPath(modelSpecId: string): string {
  return researchEntityPath(
    '/research/lab',
    'specs',
    'model-spec',
    modelSpecId,
  );
}

export function trainingDatasetOpenPath(trainingDatasetId: string): string {
  return researchEntityPath(
    '/research/lab',
    'datasets',
    'training-dataset',
    trainingDatasetId,
  );
}

export function modelVersionOpenPath(modelVersionId: string): string {
  return researchEntityPath(
    '/research/lab',
    'models',
    'model-version',
    modelVersionId,
  );
}

export function factorOpenPath(factorDefinitionId: string): string {
  return researchEntityPath(
    '/research/lab',
    'factors',
    'factor',
    factorDefinitionId,
  );
}

export function backtestOpenPath(backtestReportId: string): string {
  return researchEntityPath(
    '/research/lab',
    'evaluation',
    'backtest',
    backtestReportId,
  );
}

export function comparisonOpenPath(comparisonReportId: string): string {
  return researchEntityPath(
    '/research/lab',
    'evaluation',
    'comparison',
    comparisonReportId,
  );
}

export function tradePolicyOpenPath(artifactId: string): string {
  return researchEntityPath(
    '/research/learning-policy',
    'policies',
    'trade-policy',
    artifactId,
  );
}

export function calibrationArtifactOpenPath(artifactId: string): string {
  return researchEntityPath(
    '/research/learning-policy',
    'calibration',
    'calibration-artifact',
    artifactId,
  );
}

export function feedbackCycleOpenPath(feedbackCycleId: string): string {
  return researchEntityPath(
    '/research/learning-policy',
    'feedback',
    'feedback-cycle',
    feedbackCycleId,
  );
}

export function marketLinkageOpenPath(marketId: string): string {
  return researchEntityPath(
    '/research/data-reliability',
    'linkages',
    'market-linkage',
    marketId,
  );
}
