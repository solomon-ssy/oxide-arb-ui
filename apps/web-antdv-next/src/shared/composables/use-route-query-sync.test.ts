import { describe, expect, it } from 'vitest';

import { queryEntityIdMatches } from '#/shared/routes/execution-plane';

describe('useQueryOpenDrawer stale guard', () => {
  it('discards a fetch when the open id changed during the request', () => {
    expect(queryEntityIdMatches('order', 'order-a', 'order', 'order-b')).toBe(
      false,
    );
    expect(queryEntityIdMatches('order', 'order-a', 'order', 'order-a')).toBe(
      true,
    );
  });

  it('normalizes array query values', () => {
    expect(
      queryEntityIdMatches('order', 'order-a', ['order'], ['order-a', 'stale']),
    ).toBe(true);
    expect(
      queryEntityIdMatches('order', 'order-a', ['order'], ['order-b']),
    ).toBe(false);
  });
});
