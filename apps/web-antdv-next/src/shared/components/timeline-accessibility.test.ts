import { createApp, defineComponent, h, nextTick } from 'vue';

import Steps from 'antdv-next/dist/steps/index';
import Timeline, { TimelineItem } from 'antdv-next/dist/timeline/index';
import { describe, expect, it, vi } from 'vitest';

describe('antdv timeline accessibility contract', () => {
  it('keeps non-interactive timeline entries as native list items', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const subject = defineComponent(
      () => () =>
        h(Timeline, null, {
          default: () =>
            h(TimelineItem, null, {
              default: () => 'immutable audit event',
            }),
        }),
    );
    const app = createApp(subject);

    try {
      app.mount(host);
      await nextTick();

      const root = host.querySelector('ol');
      const item = root?.querySelector(':scope > li');
      expect(root).not.toBeNull();
      expect(item?.getAttribute('role')).toBeNull();
      expect(item?.getAttribute('tabindex')).toBeNull();
      expect(item?.textContent).toContain('immutable audit event');
    } finally {
      app.unmount();
      host.remove();
    }
  });

  it('does not reserve a title column when items have no title', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const subject = defineComponent(
      () => () =>
        h(
          Timeline,
          { mode: 'start', pending: true, variant: 'outlined' },
          {
            default: () =>
              h(
                TimelineItem,
                { color: 'green' },
                {
                  default: () => 'bootstrap committed',
                },
              ),
          },
        ),
    );
    const app = createApp(subject);

    try {
      app.mount(host);
      await nextTick();

      const root = host.querySelector('ol');
      expect(root?.className).not.toContain('layout-alternate');
      expect(host.textContent).toContain('bootstrap committed');
    } finally {
      app.unmount();
      host.remove();
    }
  });

  it('keeps pending and titled entries as native list items', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const subject = defineComponent(
      () => () =>
        h(
          Timeline,
          { mode: 'start', pending: true, variant: 'outlined' },
          {
            default: () =>
              h(
                TimelineItem,
                { color: 'green', title: '2026-08-18 11:28' },
                {
                  default: () => 'bootstrap committed',
                },
              ),
          },
        ),
    );
    const app = createApp(subject);

    try {
      app.mount(host);
      await nextTick();

      const root = host.querySelector('ol');
      const items = root?.querySelectorAll(':scope > li');
      expect(root).not.toBeNull();
      expect(items?.length).toBeGreaterThan(0);
      for (const item of items ?? []) {
        expect(item.getAttribute('role')).toBeNull();
        expect(item.getAttribute('tabindex')).toBeNull();
      }
      expect(host.textContent).toContain('bootstrap committed');
    } finally {
      app.unmount();
      host.remove();
    }
  });

  it('preserves interactive step semantics when an onChange handler exists', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const onChange = vi.fn();
    const subject = defineComponent(
      () => () =>
        h(Steps, {
          current: 0,
          items: [{ title: 'first' }, { title: 'second' }],
          onChange,
        }),
    );
    const app = createApp(subject);

    try {
      app.mount(host);
      await nextTick();

      const items = host.querySelectorAll('div[role="button"]');
      expect(items).toHaveLength(2);
      expect(items[1]?.getAttribute('tabindex')).toBe('0');
      items[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(onChange).toHaveBeenCalledWith(1);
    } finally {
      app.unmount();
      host.remove();
    }
  });
});
