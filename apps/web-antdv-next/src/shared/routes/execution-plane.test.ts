import { describe, expect, it } from 'vitest';

import {
  executionOrderOpenPath,
  positionOpenPath,
  queryEntityIdMatches,
  reconciliationQueuePath,
  settlementRedeemOpenPath,
  settlementRedeemsPath,
} from './execution-plane';

describe('execution-plane routes', () => {
  it('builds reconciliation queue paths with optional filters', () => {
    expect(reconciliationQueuePath()).toBe(
      '/execution/post-trade?module=reconciliation',
    );
    expect(
      reconciliationQueuePath({
        execution_order_id: 'eo-1',
        order_intent_id: 'intent-1',
      }),
    ).toBe(
      '/execution/post-trade?module=reconciliation&execution_order_id=eo-1&order_intent_id=intent-1',
    );
  });

  it('builds settlement redeem list paths with optional market filter', () => {
    expect(settlementRedeemsPath()).toBe(
      '/execution/post-trade?module=settlement',
    );
    expect(settlementRedeemsPath({ market_id: 'm-1' })).toBe(
      '/execution/post-trade?module=settlement&market_id=m-1',
    );
  });

  it('builds entity open deep links', () => {
    expect(executionOrderOpenPath('eo/1')).toBe(
      '/execution/orders?module=orders&entity=execution-order&id=eo%2F1',
    );
    expect(positionOpenPath('pos-1')).toBe(
      '/execution/portfolio?module=positions&entity=position&id=pos-1',
    );
    expect(settlementRedeemOpenPath('batch-1')).toBe(
      '/execution/post-trade?module=settlement&entity=settlement-redeem&id=batch-1',
    );
  });

  it('matches reactive open ids after navigation', () => {
    expect(queryEntityIdMatches('order', 'a', 'order', 'a')).toBe(true);
    expect(queryEntityIdMatches('order', 'a', ['order'], ['a'])).toBe(true);
    expect(queryEntityIdMatches('order', 'a', 'position', 'a')).toBe(false);
    expect(queryEntityIdMatches('order', 'a', 'order', 'b')).toBe(false);
    expect(queryEntityIdMatches('order', 'a', 'order', undefined)).toBe(false);
  });
});
