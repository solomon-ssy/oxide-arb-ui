import { describe, expect, it } from 'vitest';

import { marketOpenPath } from './trading-plane';

describe('trading-plane routes', () => {
  it('opens market detail on the live contextual module', () => {
    expect(marketOpenPath('0xabc')).toBe(
      '/trading/market-intelligence?module=live&entity=market&id=0xabc',
    );
    expect(marketOpenPath('id/with slash')).toBe(
      '/trading/market-intelligence?module=live&entity=market&id=id%2Fwith+slash',
    );
  });
});
