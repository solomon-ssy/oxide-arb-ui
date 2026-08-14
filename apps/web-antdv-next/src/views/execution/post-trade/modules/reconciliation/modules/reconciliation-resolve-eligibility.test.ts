import {
  isReconciliationOperatorResolvable,
  OPERATOR_RECONCILIATION_RESULTS,
  RECONCILIATION_RESULTS,
} from '@vben/types';

import { describe, expect, it } from 'vitest';

describe('isReconciliationOperatorResolvable', () => {
  it('allows resolve only for unresolvable rows without resolved_at', () => {
    expect(
      isReconciliationOperatorResolvable({
        resolved_at: null,
        result: RECONCILIATION_RESULTS.unresolvable,
      }),
    ).toBe(true);
  });

  it('rejects pending in-flight rows', () => {
    expect(
      isReconciliationOperatorResolvable({
        resolved_at: null,
        result: RECONCILIATION_RESULTS.pending,
      }),
    ).toBe(false);
  });

  it('rejects already resolved unresolvable rows', () => {
    expect(
      isReconciliationOperatorResolvable({
        resolved_at: '2026-01-01T00:00:00.000Z',
        result: RECONCILIATION_RESULTS.unresolvable,
      }),
    ).toBe(false);
  });
});

describe('operatorReconciliationResults', () => {
  it('excludes machine-only and in-flight verdicts', () => {
    expect(OPERATOR_RECONCILIATION_RESULTS).not.toContain(
      RECONCILIATION_RESULTS.pending,
    );
    expect(OPERATOR_RECONCILIATION_RESULTS).not.toContain(
      RECONCILIATION_RESULTS.unresolvable,
    );
  });
});
