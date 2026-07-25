import { createApp, defineComponent, h, nextTick } from 'vue';

import Progress from 'antdv-next/dist/progress/index';
import { describe, expect, it, vi } from 'vitest';

import InlineBar from './inline-bar.vue';

vi.mock('antdv-next', async () => {
  const progressModule = await import('antdv-next/dist/progress/index');
  return { Progress: progressModule.default };
});

describe('inline bar accessibility contract', () => {
  it.each([
    { mode: 'linear' as const, value: 0.625 },
    { mode: 'diverging' as const, value: -0.125 },
  ])('names the $mode progressbar', async ({ mode, value }) => {
    const host = document.createElement('div');
    document.body.append(host);
    const subject = defineComponent(
      () => () =>
        h(InlineBar, {
          label: 'Crypto share',
          max: 1,
          min: mode === 'linear' ? 0 : -1,
          mode,
          value,
        }),
    );
    const app = createApp(subject);

    try {
      app.mount(host);
      await nextTick();

      const progressbar = host.querySelector('[role="progressbar"]');
      expect(progressbar?.getAttribute('aria-label')).toBe('Crypto share');
    } finally {
      app.unmount();
      host.remove();
    }
  });
});

describe('antdv progress accessibility patch', () => {
  it('preserves aria-labelledby on the semantic root', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const subject = defineComponent(
      () => () =>
        h('div', [
          h('span', { id: 'progress-label' }, 'Evaluation coverage'),
          h(Progress, {
            'aria-labelledby': 'progress-label',
            percent: 80,
            showInfo: false,
          }),
        ]),
    );
    const app = createApp(subject);

    try {
      app.mount(host);
      await nextTick();

      expect(
        host
          .querySelector('[role="progressbar"]')
          ?.getAttribute('aria-labelledby'),
      ).toBe('progress-label');
    } finally {
      app.unmount();
      host.remove();
    }
  });
});
