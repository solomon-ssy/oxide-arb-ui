import type { SetupContext } from 'vue';

import type { DashboardExposureView, DashboardSection } from '@vben/types';

import { createApp, h, nextTick } from 'vue';

import { describe, expect, it, vi } from 'vitest';

import { i18n } from '#/locales';
import enPage from '#/locales/langs/en-US/page.json';
import zhPage from '#/locales/langs/zh-CN/page.json';

import ExposureTreemap from './exposure-treemap.vue';

vi.mock('@vben/plugins/echarts', () => ({
  EchartsUI: 'div',
  useEcharts: () => ({ renderEcharts: vi.fn() }),
}));
vi.mock('antdv-next', async () => {
  const progressModule = await import('antdv-next/dist/progress/index');
  return { Empty: 'div', Progress: progressModule.default };
});
vi.mock('#/shared/components/insight-panel.vue', () => ({
  default: {
    setup(_props: unknown, { slots }: SetupContext) {
      return () => h('section', slots.default?.());
    },
  },
}));

const scenarios: {
  categories: DashboardExposureView['exposures']['per_category'];
  name: string;
  percentages: string[];
}[] = [
  { categories: { crypto: '40' }, name: 'full share', percentages: ['100'] },
  {
    categories: { crypto: '30', weather: '10' },
    name: 'multiple shares',
    percentages: ['75', '25'],
  },
  { categories: { crypto: '0' }, name: 'zero share', percentages: ['0'] },
];

describe.each(['en-US', 'zh-CN'] as const)(
  'exposure progress accessibility in %s',
  (locale) => {
    it.each(scenarios)(
      'names every $name progressbar',
      async ({ categories, percentages }) => {
        i18n.global.setLocaleMessage(locale, {
          page: locale === 'en-US' ? enPage : zhPage,
        });
        i18n.global.locale.value = locale;
        const section: DashboardSection<DashboardExposureView> = {
          observed_at: '2026-08-30T00:00:00Z',
          state: 'ready',
          value: {
            exposures: {
              per_category: categories,
              per_event: {},
              per_market: {},
            },
            position_count: Object.keys(categories).length,
          },
        };
        const host = document.createElement('div');
        document.body.append(host);
        const app = createApp(ExposureTreemap, { section });
        try {
          app.mount(host);
          await nextTick();
          const progressbars = [
            ...host.querySelectorAll('[role="progressbar"]'),
          ];
          expect(
            progressbars.map((bar) => bar.getAttribute('aria-valuenow')),
          ).toEqual(percentages);
          expect(
            progressbars.map((bar) => bar.getAttribute('aria-label')),
          ).toEqual(
            Object.keys(categories).map((category) =>
              locale === 'en-US'
                ? `${category} share of total account exposure`
                : `${category} 占账户总敞口的比例`,
            ),
          );
        } finally {
          app.unmount();
          host.remove();
        }
      },
    );
  },
);
