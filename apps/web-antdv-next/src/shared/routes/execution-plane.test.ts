import { describe, expect, it } from 'vitest';

import {
  executionOrderOpenPath,
  positionOpenPath,
  queryOpenIdMatches,
  reconciliationQueuePath,
  settlementRedeemOpenPath,
  settlementRedeemsPath,
} from './execution-plane';

describe('execution-plane routes', () => {
  it('builds reconciliation queue paths with optional filters', () => {
    expect(reconciliationQueuePath()).toBe('/quant/reconciliations');
    expect(
      reconciliationQueuePath({
        execution_order_id: 'eo-1',
        order_intent_id: 'intent-1',
      }),
    ).toBe(
      '/quant/reconciliations?execution_order_id=eo-1&order_intent_id=intent-1',
    );
  });

  it('builds settlement redeem list paths with optional market filter', () => {
    expect(settlementRedeemsPath()).toBe('/quant/settlement-redeems');
    expect(settlementRedeemsPath({ market_id: 'm-1' })).toBe(
      '/quant/settlement-redeems?market_id=m-1',
    );
  });

  it('builds entity open deep links', () => {
    expect(executionOrderOpenPath('eo/1')).toBe(
      '/quant/execution-orders?open=eo%2F1',
    );
    expect(positionOpenPath('pos-1')).toBe('/quant/positions?open=pos-1');
    expect(settlementRedeemOpenPath('batch-1')).toBe(
      '/quant/settlement-redeems?open=batch-1',
    );
  });

  it('matches reactive open ids after navigation', () => {
    expect(queryOpenIdMatches('a', 'a')).toBe(true);
    expect(queryOpenIdMatches('a', ['a'])).toBe(true);
    expect(queryOpenIdMatches('a', 'b')).toBe(false);
    expect(queryOpenIdMatches('a', '')).toBe(false);
    expect(queryOpenIdMatches('a', undefined)).toBe(false);
  });
});
