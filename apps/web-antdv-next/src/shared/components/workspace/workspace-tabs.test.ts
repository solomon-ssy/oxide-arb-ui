import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import WorkspaceTabs from './workspace-tabs.vue';

vi.mock('@vben/icons', () => ({ IconifyIcon: 'svg' }));
vi.mock('#/locales', () => ({ $t: (key: string) => key }));

const modules = [
  { icon: 'lucide:landmark', key: 'account', label: 'Account' },
  { icon: 'lucide:briefcase-business', key: 'positions', label: 'Positions' },
  { icon: 'lucide:badge-dollar-sign', key: 'incentives', label: 'Incentives' },
];
const cleanups: (() => void)[] = [];

async function mountTabs(initial = 'account') {
  const host = document.createElement('div');
  document.body.append(host);
  const selected = ref(initial);
  const navigate = vi.fn((key: string) => {
    selected.value = key;
  });
  const scroll = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
  const app = createApp(
    defineComponent(
      () => () =>
        h(
          WorkspaceTabs,
          {
            label: 'Portfolio',
            modelValue: selected.value,
            modules,
            'onUpdate:modelValue': navigate,
          },
          { default: () => h('p', `Content for ${selected.value}`) },
        ),
    ),
  );
  cleanups.push(() => {
    app.unmount();
    host.remove();
  });
  app.mount(host);
  await nextTick();
  const buttons = [...host.querySelectorAll<HTMLButtonElement>('[role=tab]')];
  return { buttons, host, navigate, scroll, selected };
}

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  vi.restoreAllMocks();
});

describe('workspace scroll tabs', () => {
  it('connects each tab to its panel and mounts only active content', async () => {
    const { buttons, host } = await mountTabs('incentives');
    const tablist = host.querySelector('[role=tablist]');
    expect(tablist?.getAttribute('aria-label')).toBe('Portfolio');
    expect(tablist?.children).toHaveLength(modules.length);
    expect(host.querySelectorAll('button')).toHaveLength(modules.length);
    for (const button of buttons) {
      expect(button.getAttribute('role')).toBe('tab');
      const panel = host.querySelector<HTMLElement>(
        `#${CSS.escape(button.getAttribute('aria-controls') ?? '')}`,
      );
      expect(panel?.getAttribute('role')).toBe('tabpanel');
      expect(panel?.getAttribute('aria-labelledby')).toBe(button.id);
      expect(panel?.hidden).toBe(
        button.getAttribute('aria-selected') !== 'true',
      );
    }
    expect(host.querySelectorAll('[role=tabpanel] p')).toHaveLength(1);
    expect(
      host.querySelector('[role=tabpanel]:not([hidden])')?.textContent,
    ).toBe('Content for incentives');
    expect(buttons.map((button) => button.tabIndex)).toEqual([-1, -1, 0]);
  });

  it('supports wrapped arrows and Home/End without activating async content', async () => {
    const { buttons, selected } = await mountTabs();
    buttons[0]?.focus();
    for (const [key, expectedIndex] of [
      ['End', 2],
      ['ArrowRight', 0],
      ['ArrowLeft', 2],
      ['Home', 0],
    ] as const) {
      const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key,
      });
      document.activeElement?.dispatchEvent(event);
      await nextTick();
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(buttons[expectedIndex]);
      expect(buttons.filter((button) => button.tabIndex === 0)).toEqual([
        buttons[expectedIndex],
      ]);
      expect(selected.value).toBe('account');
    }
    buttons[2]?.click();
    await nextTick();
    expect(selected.value).toBe('incentives');
    expect(buttons[2]?.getAttribute('aria-selected')).toBe('true');
  });

  it('re-emits the highlighted owner so contextual routes can return to landing', async () => {
    const { buttons, navigate, selected } = await mountTabs('account');
    buttons[0]?.click();
    await nextTick();
    buttons[0]?.click();
    await nextTick();
    expect(selected.value).toBe('account');
    expect(navigate.mock.calls).toEqual([['account'], ['account']]);
  });

  it('reveals the selected tab on deep-link changes without measuring layout', async () => {
    const { buttons, scroll, selected } = await mountTabs();
    scroll.mockClear();
    selected.value = 'incentives';
    await nextTick();
    await nextTick();
    expect(buttons[2]?.tabIndex).toBe(0);
    expect(scroll).toHaveBeenLastCalledWith({
      block: 'nearest',
      inline: 'nearest',
    });
    expect(scroll.mock.contexts.at(-1)).toBe(buttons[2]);
  });
});
