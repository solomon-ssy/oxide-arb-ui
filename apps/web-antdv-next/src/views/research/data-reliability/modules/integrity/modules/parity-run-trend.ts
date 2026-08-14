import type {
  FeatureParityRunKind,
  FeatureParityRunStatus,
  FeatureParityRunView,
} from '@vben/types';

/** One validated run point rendered by the integrity trend chart. */
export interface ParityRunTrendPoint {
  comparedCount: number;
  createdAt: number;
  kind: FeatureParityRunKind;
  mismatchedCount: number;
  parityRunId: string;
  pendingCount: number;
  status: FeatureParityRunStatus;
}

/** Valid chart points plus the number of malformed wire rows rejected. */
export interface ParityRunTrend {
  points: ParityRunTrendPoint[];
  rejectedCount: number;
}

function isValidCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

/**
 * Validates and chronologically orders parity-run facts without inventing
 * fallback timestamps or counts for malformed wire rows.
 */
export function buildParityRunTrend(
  runs: readonly FeatureParityRunView[],
): ParityRunTrend {
  const points: ParityRunTrendPoint[] = [];
  let rejectedCount = 0;

  for (const run of runs) {
    const createdAt = Date.parse(run.created_at);
    if (
      !Number.isFinite(createdAt) ||
      !isValidCount(run.compared_count) ||
      !isValidCount(run.mismatched_count) ||
      !isValidCount(run.pending_materialization_count)
    ) {
      rejectedCount += 1;
      continue;
    }

    points.push({
      comparedCount: run.compared_count,
      createdAt,
      kind: run.kind,
      mismatchedCount: run.mismatched_count,
      parityRunId: run.parity_run_id,
      pendingCount: run.pending_materialization_count,
      status: run.status,
    });
  }

  points.sort(
    (left, right) =>
      left.createdAt - right.createdAt ||
      left.parityRunId.localeCompare(right.parityRunId),
  );

  return { points, rejectedCount };
}
