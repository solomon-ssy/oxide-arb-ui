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
  return `/research/feature-integrity?run_id=${encodeURIComponent(runId)}`;
}

/** Normalize Vue Router's scalar/array query representation without fallback IDs. */
export function featureIntegrityRunIdFromQuery(
  value: unknown,
): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
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
