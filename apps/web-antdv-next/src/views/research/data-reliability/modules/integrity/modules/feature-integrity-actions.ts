import type {
  FeatureIntegrityLatchView,
  FeatureParityRunView,
} from '@vben/types';

import {
  isRecoveryEligible,
  isUninitializedLatch,
} from './recovery-eligibility';

/** Canonical deep link for one parity run and its evidence rows. */
export function featureIntegrityRunRoute(runId: string): string {
  return `/research/data-reliability?module=feature-integrity&entity=parity-run&id=${encodeURIComponent(runId)}`;
}

/** Resolve only the canonical parity-run entity/id query pair. */
export function featureIntegrityRunIdFromQuery(
  entityValue: unknown,
  idValue: unknown,
): string | undefined {
  const entity = Array.isArray(entityValue) ? entityValue[0] : entityValue;
  const candidate = Array.isArray(idValue) ? idValue[0] : idValue;
  if (entity !== 'parity-run') return undefined;
  return typeof candidate === 'string' && candidate !== ''
    ? candidate
    : undefined;
}

export function canRunFullFeatureParity(input: {
  hasPermission: boolean;
  latch: FeatureIntegrityLatchView | null | undefined;
  summaryAvailable: boolean;
  summaryLoading: boolean;
}): boolean {
  return (
    input.hasPermission &&
    input.summaryAvailable &&
    !input.summaryLoading &&
    Boolean(input.latch) &&
    !isUninitializedLatch(input.latch)
  );
}

export function canClearFeatureParityLatch(
  hasPermission: boolean,
  latch: FeatureIntegrityLatchView | null | undefined,
  recoveryRun: FeatureParityRunView | null | undefined,
): boolean {
  return hasPermission && isRecoveryEligible(latch, recoveryRun);
}
