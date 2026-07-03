import { describe, expect, it } from 'vitest';

import { queryOpenIdMatches } from '#/shared/routes/execution-plane';

describe('useQueryOpenDrawer stale guard', () => {
  it('discards a fetch when the open id changed during the request', () => {
    expect(queryOpenIdMatches('order-a', 'order-b')).toBe(false);
    expect(queryOpenIdMatches('order-a', 'order-a')).toBe(true);
  });

  it('normalizes array query values', () => {
    expect(queryOpenIdMatches('order-a', ['order-a', 'stale'])).toBe(true);
    expect(queryOpenIdMatches('order-a', ['order-b'])).toBe(false);
  });
});
