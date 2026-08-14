import type {
  FeatureIntegrityLatchView,
  FeatureParityRunView,
} from '@vben/types';

import { FEATURE_PARITY_RUN_STATUSES } from '@vben/types';

export type RecoveryRunScope = 'frozen_model_dataset' | 'serving_runtime';

/**
 * Recovery proofs have exactly two valid scopes. Keeping this classification
 * explicit prevents a malformed mixed subject from being presented as an
 * operator-selectable proof; the server remains authoritative for the causal
 * scope/window checks of an already-open latch.
 */
export function recoveryRunScope(
  run: FeatureParityRunView,
): null | RecoveryRunScope {
  const hasReport = Boolean(run.report_id);
  const hasModel = Boolean(run.model_version_id);
  const hasDataset = Boolean(run.training_dataset_id);

  if (!hasReport && !hasModel && !hasDataset) {
    return 'serving_runtime';
  }
  if (!hasReport && hasModel && hasDataset) {
    return 'frozen_model_dataset';
  }
  return null;
}

/** Mirror the non-causal portion of the repository recovery invariant. */
export function isCompletePassedFullRun(run: FeatureParityRunView): boolean {
  return (
    run.kind === 'full' &&
    run.status === FEATURE_PARITY_RUN_STATUSES.passed &&
    Number.isSafeInteger(run.total_count) &&
    run.total_count > 0 &&
    Number.isSafeInteger(run.compared_count) &&
    run.compared_count === run.total_count &&
    Number.isSafeInteger(run.matched_count) &&
    run.matched_count === run.total_count &&
    Number.isSafeInteger(run.mismatched_count) &&
    run.mismatched_count === 0 &&
    Number.isSafeInteger(run.pending_materialization_count) &&
    run.pending_materialization_count === 0 &&
    typeof run.feature_contract_hash === 'string' &&
    run.feature_contract_hash.trim() !== '' &&
    typeof run.transform_hash === 'string' &&
    run.transform_hash.trim() !== '' &&
    typeof run.finished_at === 'string' &&
    Number.isFinite(Date.parse(run.finished_at)) &&
    recoveryRunScope(run) !== null
  );
}

/** An absent persisted state is the guarded bootstrap latch projection. */
export function isUninitializedLatch(
  latch: FeatureIntegrityLatchView | null | undefined,
): boolean {
  return Boolean(latch?.open && !latch.blocking_run_id && !latch.opened_at);
}

/**
 * Client-side affordance only; the governed endpoint remains authoritative.
 *
 * A persisted causal latch requires a recovery run that finished strictly
 * after its transition. The uninitialized bootstrap latch has no transition
 * timestamp or serving evidence population; in that state only a complete
 * model/dataset-bound frozen proof is offered as the safe first
 * acknowledgement. The repository remains authoritative for every commit.
 */
export function isRecoveryEligible(
  latch: FeatureIntegrityLatchView | null | undefined,
  run: FeatureParityRunView | null | undefined,
): boolean {
  if (!latch?.open || !run || !isCompletePassedFullRun(run)) {
    return false;
  }
  if (isUninitializedLatch(latch)) {
    return recoveryRunScope(run) === 'frozen_model_dataset';
  }
  if (!latch.blocking_run_id || !latch.opened_at || !run.finished_at) {
    return false;
  }

  const openedAt = Date.parse(latch.opened_at);
  const finishedAt = Date.parse(run.finished_at);
  return (
    Number.isFinite(openedAt) &&
    Number.isFinite(finishedAt) &&
    finishedAt > openedAt
  );
}

/** Newest eligible proof first; selection remains an explicit operator action. */
export function recoveryRunCandidates(
  latch: FeatureIntegrityLatchView | null | undefined,
  runs: FeatureParityRunView[],
): FeatureParityRunView[] {
  return runs
    .filter((run) => isRecoveryEligible(latch, run))
    .toSorted((left, right) => {
      const finishedOrder =
        Date.parse(right.finished_at ?? '') -
        Date.parse(left.finished_at ?? '');
      return (
        finishedOrder || right.parity_run_id.localeCompare(left.parity_run_id)
      );
    });
}
