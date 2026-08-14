export type FeedbackWorkbenchState =
  | 'blocked'
  | 'empty'
  | 'error'
  | 'loading'
  | 'permission'
  | 'ready';

export interface FeedbackWorkbenchStateInput {
  canRead: boolean;
  cycleCount: number;
  hasOverview: boolean;
  hasReadiness: boolean;
  loadError: boolean;
  loading: boolean;
}

/**
 * Keep operator-visible workbench states distinct. In particular, missing
 * readiness is a blocked fact, not an empty catalog or a synthetic zero.
 */
export function feedbackWorkbenchState({
  canRead,
  cycleCount,
  hasOverview,
  hasReadiness,
  loadError,
  loading,
}: FeedbackWorkbenchStateInput): FeedbackWorkbenchState {
  if (!canRead) {
    return 'permission';
  }
  if (!hasOverview) {
    return loadError && !loading ? 'error' : 'loading';
  }
  if (hasOverview && !hasReadiness) {
    return 'blocked';
  }
  if (hasOverview && cycleCount === 0) {
    return 'empty';
  }
  return 'ready';
}
