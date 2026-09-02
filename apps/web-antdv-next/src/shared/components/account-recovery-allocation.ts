import type {
  AccountRecoveryMismatch,
  AccountRecoverySellAllocation,
} from '@vben/types';

import Decimal from 'decimal.js';

export type AllocationRequirement = Extract<
  AccountRecoveryMismatch,
  { kind: 'lot_allocation_required' }
>;

export type AllocationDraft = Record<string, Record<string, string>>;

export type AllocationBuildResult =
  | { allocations: AccountRecoverySellAllocation[]; ok: true }
  | {
      error: 'invalid_decimal' | 'total_mismatch';
      expected?: string;
      ok: false;
    };

export function buildRecoveryAllocations(
  requirements: readonly AllocationRequirement[],
  draft: AllocationDraft,
): AllocationBuildResult {
  const allocations: AccountRecoverySellAllocation[] = [];
  for (const requirement of requirements) {
    let total = new Decimal(0);
    for (const lotId of requirement.candidate_lot_ids) {
      const raw = (
        draft[requirement.account_chain_execution_id]?.[lotId] ?? ''
      ).trim();
      if (raw === '') continue;
      let shares: Decimal;
      try {
        shares = new Decimal(raw);
      } catch {
        return { error: 'invalid_decimal', ok: false };
      }
      if (!shares.isFinite() || !shares.isPositive()) {
        return { error: 'invalid_decimal', ok: false };
      }
      total = total.plus(shares);
      allocations.push({
        account_chain_execution_id: requirement.account_chain_execution_id,
        shares: shares.toString(),
        strategy_position_lot_id: lotId,
      });
    }
    if (!total.equals(new Decimal(requirement.sold_shares))) {
      return {
        error: 'total_mismatch',
        expected: requirement.sold_shares,
        ok: false,
      };
    }
  }
  return { allocations, ok: true };
}
