import type { OperationalDegradeReason } from '@vben/types';

/** Stable i18n key suffix for a degrade reason wire value. */
export function degradeReasonKey(reason: OperationalDegradeReason): string {
  if (typeof reason === 'object' && 'subsystem_unhealthy' in reason) {
    return 'subsystem_unhealthy';
  }
  return reason;
}

/** Optional interpolation params for degrade-reason labels. */
export function degradeReasonParams(
  reason: OperationalDegradeReason,
): Record<string, string> | undefined {
  if (typeof reason === 'object' && 'subsystem_unhealthy' in reason) {
    return { name: reason.subsystem_unhealthy.name };
  }
  return undefined;
}
