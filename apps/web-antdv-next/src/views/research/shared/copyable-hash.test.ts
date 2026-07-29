import { createApp, nextTick } from 'vue';

import { describe, expect, it, vi } from 'vitest';

import CopyableHash from './copyable-hash.vue';

const { copy } = vi.hoisted(() => ({
  copy: vi.fn(async () => {}),
}));

vi.mock('@vueuse/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@vueuse/core')>();
  return {
    ...original,
    useClipboard: () => ({ copy }),
  };
});

vi.mock('@vben/icons', () => ({
  IconifyIcon: 'span',
}));

vi.mock('#/locales', () => ({
  $t: (key: string, values?: Record<string, string>) =>
    values?.label ? `${key}:${values.label}` : key,
}));

vi.mock('antdv-next', () => ({
  Button: 'button',
  Tooltip: 'span',
}));

describe('copyable hash accessibility', () => {
  it('names its icon-only control and announces completion', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp(CopyableHash, {
      label: 'serving contract hash',
      value: 'blake3:serving',
    });

    try {
      app.mount(host);
      await nextTick();
      const button = host.querySelector<HTMLButtonElement>('button');
      expect(button?.getAttribute('aria-label')).toContain(
        'serving contract hash',
      );
      button?.click();
      await vi.waitFor(() => {
        expect(copy).toHaveBeenCalledWith('blake3:serving');
        expect(host.querySelector('[role="status"]')?.textContent).toContain(
          'serving contract hash',
        );
      });
    } finally {
      app.unmount();
      host.remove();
    }
  });
});
