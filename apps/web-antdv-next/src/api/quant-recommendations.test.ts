import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getRecommendationEconomicOutcome,
  getRecommendationExecutionComparison,
} from './quant-recommendations';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('#/api/request', () => ({
  requestClient: { get: mocks.get },
}));

describe('recommendation optional economic resources', () => {
  beforeEach(() => mocks.get.mockReset());

  it('preserves successful null empty states', async () => {
    mocks.get.mockResolvedValue(null);

    await expect(getRecommendationEconomicOutcome('rec-1')).resolves.toBeNull();
    await expect(
      getRecommendationExecutionComparison('rec-1'),
    ).resolves.toBeNull();
    expect(mocks.get).toHaveBeenNthCalledWith(
      1,
      '/quant/recommendations/rec-1/economic-outcome',
    );
    expect(mocks.get).toHaveBeenNthCalledWith(
      2,
      '/quant/recommendations/rec-1/execution-comparison',
    );
  });
});
