import type { RunBacktestRequest } from '@vben/types';

export type BacktestRequestBody = Omit<RunBacktestRequest, 'reason'>;

/**
 * Build the only bindings an Evaluation replay may emit. Unknown legacy form
 * fields are deliberately ignored instead of being forwarded to the wire.
 */
export function backtestRequestBody(
  values: Record<string, unknown>,
): BacktestRequestBody | null {
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
