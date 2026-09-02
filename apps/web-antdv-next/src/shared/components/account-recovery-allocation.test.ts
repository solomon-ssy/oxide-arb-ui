import type { AllocationRequirement } from './account-recovery-allocation';

import { describe, expect, it } from 'vitest';

import { buildRecoveryAllocations } from './account-recovery-allocation';

const requirement: AllocationRequirement = {
  account_chain_execution_id: 'execution-1',
  candidate_lot_ids: ['lot-a', 'lot-b'],
  kind: 'lot_allocation_required',
  sold_shares: '3',
  token_id: 'token-1',
};

describe('buildRecoveryAllocations', () => {
  it('requires an exact positive allocation sum', () => {
    expect(
      buildRecoveryAllocations([requirement], {
        'execution-1': { 'lot-a': '1.25', 'lot-b': '1.75' },
      }),
    ).toEqual({
      allocations: [
        {
          account_chain_execution_id: 'execution-1',
          shares: '1.25',
          strategy_position_lot_id: 'lot-a',
        },
        {
          account_chain_execution_id: 'execution-1',
          shares: '1.75',
          strategy_position_lot_id: 'lot-b',
        },
      ],
      ok: true,
    });
  });

  it('rejects a non-positive or malformed share value', () => {
    expect(
      buildRecoveryAllocations([requirement], {
        'execution-1': { 'lot-a': '-1', 'lot-b': '4' },
      }),
    ).toEqual({ error: 'invalid_decimal', ok: false });
  });

  it('rejects an inexact total', () => {
    expect(
      buildRecoveryAllocations([requirement], {
        'execution-1': { 'lot-a': '1', 'lot-b': '1' },
      }),
    ).toEqual({ error: 'total_mismatch', expected: '3', ok: false });
  });
});
