import type { RunBacktestRequest } from '@vben/types';

export type BacktestRequestBody = Omit<RunBacktestRequest, 'reason'>;

const BACKTEST_FIELDS = new Set([
  'comparison_model_version_id',
  'decision_policy_snapshot_id',
  'evaluation_dataset_id',
]);

/** Build the exact current bindings an Evaluation replay may emit. */
export function backtestRequestBody(
  values: Record<string, unknown>,
): BacktestRequestBody | null {
  if (Object.keys(values).some((key) => !BACKTEST_FIELDS.has(key))) {
    return null;
  }
  const evaluationDatasetId = values.evaluation_dataset_id;
  const decisionPolicySnapshotId = values.decision_policy_snapshot_id;
  const comparisonModelVersionId = values.comparison_model_version_id;
  if (
    typeof evaluationDatasetId !== 'string' ||
    evaluationDatasetId.trim() === '' ||
    typeof decisionPolicySnapshotId !== 'string' ||
    decisionPolicySnapshotId.trim() === '' ||
    (comparisonModelVersionId !== undefined &&
      (typeof comparisonModelVersionId !== 'string' ||
        comparisonModelVersionId.trim() === ''))
  ) {
    return null;
  }
  return {
    comparison_model_version_id: comparisonModelVersionId as string | undefined,
    decision_policy_snapshot_id: decisionPolicySnapshotId,
    evaluation_dataset_id: evaluationDatasetId,
  };
}
