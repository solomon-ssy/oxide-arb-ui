import { describe, expect, it } from 'vitest';

import { marketOpenPath, recommendationOpenPath } from './trading-plane';

describe('trading-plane routes', () => {
  it('opens market detail on the live contextual module', () => {
    expect(marketOpenPath('0xabc')).toBe(
      '/trading/market-intelligence?module=live&entity=market&id=0xabc',
    );
    expect(marketOpenPath('id/with slash')).toBe(
      '/trading/market-intelligence?module=live&entity=market&id=id%2Fwith+slash',
    );
  });

  it('opens recommendation detail on the canonical queue module', () => {
    expect(recommendationOpenPath('recommendation-1')).toBe(
      '/trading/recommendations?module=queue&entity=recommendation&id=recommendation-1',
    );
    expect(recommendationOpenPath('id/with slash')).toBe(
      '/trading/recommendations?module=queue&entity=recommendation&id=id%2Fwith+slash',
    );
  });
});
