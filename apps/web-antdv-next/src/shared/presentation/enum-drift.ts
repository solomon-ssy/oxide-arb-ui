import type { EnumName } from '@vben/types';

export interface EnumDriftEvidence {
  context?: string;
  enumName: EnumName;
  value: unknown;
}

/** Make wire-contract drift fail browser audits instead of silently rendering gray. */
export function reportEnumDrift(evidence: EnumDriftEvidence): void {
  console.error('enum_contract_drift', {
    context: evidence.context ?? 'unknown',
    enum_name: evidence.enumName,
    value: evidence.value,
  });
}
