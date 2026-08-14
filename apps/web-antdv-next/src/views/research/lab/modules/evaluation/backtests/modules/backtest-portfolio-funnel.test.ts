import type { BacktestPortfolioFunnel } from '@vben/types';

import { createApp, nextTick } from 'vue';

import { describe, expect, it, vi } from 'vitest';

import BacktestPortfolioFunnelPanel from './backtest-portfolio-funnel.vue';

vi.mock('#/locales', () => ({
  $t: (key: string) => key,
}));

vi.mock('antdv-next', () => ({
  Descriptions: 'dl',
  DescriptionsItem: 'div',
  Tag: 'span',
}));

function funnel(
  overrides: Partial<BacktestPortfolioFunnel> = {},
): BacktestPortfolioFunnel {
  return {
    schema_version: 1,
    decision_tick_count: 4,
    emitted_candidate_count: 9,
    candidate_without_executable_tier_count: 1,
    executable_tier_count: 8,
    admission_rejected_tier_count: 2,
    admitted_tier_count: 6,
    selected_tier_count: 3,
    executed_entry_count: 3,
    resolved_allocation_count: 2,
    no_candidate_tick_count: 1,
    no_executable_tier_tick_count: 1,
    no_selection_tick_count: 1,
    selected_tick_count: 1,
    tier_exclusion_reasons: [
      { count: 2, reason: 'robust_expected_net_floor' },
      { count: 3, reason: 'not_selected_by_global_optimum' },
    ],
    ...overrides,
  };
}

describe('backtest portfolio funnel', () => {
  it.each([
    {
      description:
        'renders the count-conserving funnel and canonical exclusion reasons',
      expectedDescription: '491826332',
      expectedText: [
        'page.research.backtests.detail.funnel.reasons.robustExpectedNetFloor',
        'page.research.backtests.detail.funnel.reasons.notSelectedByGlobalOptimum',
      ],
      value: funnel(),
    },
    {
      description: 'exposes an explicit no-exclusion state',
      expectedDescription: '491826332',
      expectedText: ['page.research.backtests.detail.funnel.noExclusions'],
      value: funnel({ tier_exclusion_reasons: [] }),
    },
  ])('$description', async ({ expectedDescription, expectedText, value }) => {
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp(BacktestPortfolioFunnelPanel, {
      value,
    });

    try {
      app.mount(host);
      await nextTick();
      expect(host.querySelector('dl')?.textContent).toBe(expectedDescription);
      for (const text of expectedText) {
        expect(host.textContent).toContain(text);
      }
    } finally {
      app.unmount();
      host.remove();
    }
  });
});
