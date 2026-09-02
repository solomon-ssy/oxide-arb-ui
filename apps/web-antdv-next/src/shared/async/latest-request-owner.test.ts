import { describe, expect, it, vi } from 'vitest';

import { LatestRequestOwner } from './latest-request-owner';

describe('latest request owner', () => {
  it('lets only the latest request commit data and clear loading', () => {
    const owner = new LatestRequestOwner();
    const first = owner.begin();
    const second = owner.begin();
    const state: { loading: boolean; value: null | string } = {
      loading: true,
      value: null,
    };

    expect(
      first.commit(() => {
        state.loading = false;
        state.value = 'stale-result';
      }),
    ).toBe(false);
    expect(state).toEqual({ loading: true, value: null });

    expect(
      second.commit(() => {
        state.loading = false;
        state.value = 'current-result';
      }),
    ).toBe(true);
    expect(state).toEqual({
      loading: false,
      value: 'current-result',
    });
  });

  it('rejects an in-flight request after owner invalidation', () => {
    const owner = new LatestRequestOwner();
    const request = owner.begin();
    const apply = vi.fn();

    owner.invalidate();

    expect(request.commit(apply)).toBe(false);
    expect(apply).not.toHaveBeenCalled();
  });
});
