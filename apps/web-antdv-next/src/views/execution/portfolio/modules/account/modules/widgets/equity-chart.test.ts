import type { SetupContext } from 'vue';

import type { EquitySnapshotView } from '@vben/types';

import { createApp, h, nextTick } from 'vue';

import { describe, expect, it, vi } from 'vitest';

import EquityChart from './equity-chart.vue';

const chart = vi.hoisted(() => ({ renderEcharts: vi.fn(), resize: vi.fn() }));
vi.mock('@vben/plugins/echarts', () => ({
  EchartsUI: 'div',
  useEcharts: () => chart,
}));
vi.mock('#/locales', () => ({ $t: (key: string) => key }));
vi.mock('#/shared/components/chart-panel.vue', () => ({
  default: {
    setup(_props: unknown, { slots }: SetupContext) {
      return () => h('section', slots.default?.());
    },
  },
}));

function snapshot(asOf: string, equity: string): EquitySnapshotView {
  return {
    account_snapshot_ref: `account-${equity}`,
    as_of: asOf,
    available_usd: '5000',
    capital_base_usd: '5000',
    created_at: asOf,
    drawdown_pct: '0',
    equity_snapshot_id: `equity-${equity}`,
    high_water_mark_usd: '5000',
    incentive_credit_cumulative_usd: '0',
    realized_pnl_cumulative_usd: '0',
    reserved_usd: '0',
    source: 'polymarket',
    unrealized_pnl_usd: '0',
    venue_net_liquidation_usd: equity,
  };
}

describe('equity curve input contract', () => {
  it('plots both series from the exact ranged snapshot rows', async () => {
    const snapshots = [
      snapshot('2026-08-30T03:37:51Z', '5025'),
      snapshot('2026-08-30T03:38:15Z', '5040'),
    ];
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp(EquityChart, { loading: false, snapshots });
    try {
      app.mount(host);
      await nextTick();
      expect(chart.renderEcharts).toHaveBeenLastCalledWith(
        expect.objectContaining({
          series: [
            expect.objectContaining({ data: [5025, 5040], type: 'line' }),
            expect.objectContaining({ data: [0, 0], type: 'line' }),
          ],
          xAxis: expect.objectContaining({
            data: ['08-30T03:37', '08-30T03:38'],
          }),
        }),
      );
      expect(
        host.querySelector<HTMLElement>('[data-equity-series-points]')?.dataset
          .equitySeriesPoints,
      ).toBe('2');
    } finally {
      app.unmount();
      host.remove();
    }
  });
});
