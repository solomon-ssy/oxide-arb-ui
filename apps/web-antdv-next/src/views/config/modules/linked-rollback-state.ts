import type { ModelRouteActivationReceiptView } from '@vben/types';

export type LinkedRollbackState =
  | 'actionable'
  | 'restored'
  | 'superseded'
  | 'unavailable';

/**
 * Classify an activation-bound rollback against the current routing revision.
 * A historical rollback target is only safe to preselect while the exact
 * activated revision remains current; every other state requires a fresh
 * operator decision against current configuration.
 */
export function linkedRollbackState(
  activeRevisionId: null | string,
  receipt: ModelRouteActivationReceiptView | null,
): LinkedRollbackState {
  if (activeRevisionId === null || receipt === null) {
    return 'unavailable';
  }
  if (activeRevisionId === receipt.activated_model_routing_revision_id) {
    return 'actionable';
  }
  if (
    activeRevisionId === receipt.rollback_target.rollback_target_revision_id
  ) {
    return 'restored';
  }
  return 'superseded';
}
