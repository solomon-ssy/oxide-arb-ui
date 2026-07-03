import type { ExecutionRecoveryStep } from '@vben/types';

import { $t } from '#/locales';

export * from './constants';
export * from './datetime';
export * from './ids';
export * from './money';

/** Localize a typed `ExecutionRecoveryStep` (falls back to the raw wire value). */
export function formatExecutionRecoveryStep(
  step: ExecutionRecoveryStep,
): string {
  const key = `enum.executionRecoveryStep.${step}`;
  const label = $t(key);
  return label === key ? step : label;
}
