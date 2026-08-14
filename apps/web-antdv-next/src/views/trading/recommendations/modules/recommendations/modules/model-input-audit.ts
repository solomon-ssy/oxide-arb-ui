import type { ModelInputEvidenceView } from '@vben/types';

export interface ModelInputAuditSummary {
  consistent: boolean;
  inputContractHash: string;
  trainingInputHash: string;
  transformHash: string;
}

/** Summarize immutable route hashes without hiding contradictory evidence. */
export function summarizeModelInputAudit(
  rows: ModelInputEvidenceView[],
): ModelInputAuditSummary | null {
  const first = rows[0];
  if (!first) {
    return null;
  }
  return {
    consistent: rows.every(
      (row) =>
        row.input_contract_hash === first.input_contract_hash &&
        row.training_input_hash === first.training_input_hash &&
        row.transform_hash === first.transform_hash,
    ),
    inputContractHash: first.input_contract_hash,
    trainingInputHash: first.training_input_hash,
    transformHash: first.transform_hash,
  };
}
