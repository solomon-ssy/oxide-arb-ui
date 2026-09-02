import { computed, effectScope, ref } from 'vue';

import { describe, expect, it, vi } from 'vitest';

import { useSidebarCollapse } from './use-sidebar-collapse';

describe('responsive sidebar ownership', () => {
  for (const desktopInitiallyCollapsed of [false, true]) {
    for (const mobileWidth of [1, 390]) {
      it(`preserves desktop ${desktopInitiallyCollapsed} through ${mobileWidth}px and back`, () => {
        const scope = effectScope();
        try {
          scope.run(() => {
            const width = ref(1440);
            const preference = ref(desktopInitiallyCollapsed);
            const persist = vi.fn((value: boolean) => {
              preference.value = value;
            });
            const collapsed = useSidebarCollapse(
              computed(() => width.value < 768),
              computed({ get: () => preference.value, set: persist }),
            );
            expect(collapsed.value).toBe(desktopInitiallyCollapsed);
            width.value = mobileWidth;
            expect(collapsed.value).toBe(true);
            // The lower layout's responsive close event is not a user edit.
            collapsed.value = true;
            collapsed.value = false;
            expect(collapsed.value).toBe(false);
            collapsed.value = true;
            width.value = 1440;
            expect(collapsed.value).toBe(desktopInitiallyCollapsed);
            expect(preference.value).toBe(desktopInitiallyCollapsed);
            expect(persist).not.toHaveBeenCalled();
          });
        } finally {
          scope.stop();
        }
      });
    }
  }

  it('persists explicit desktop actions and retains them after mobile closes', () => {
    const scope = effectScope();
    try {
      scope.run(() => {
        const mobile = ref(false);
        const preference = ref(false);
        const persist = vi.fn((value: boolean) => {
          preference.value = value;
        });
        const collapsed = useSidebarCollapse(
          mobile,
          computed({ get: () => preference.value, set: persist }),
        );
        collapsed.value = true;
        expect(persist).toHaveBeenLastCalledWith(true);
        mobile.value = true;
        collapsed.value = false;
        mobile.value = false;
        expect(collapsed.value).toBe(true);
        collapsed.value = false;
        expect(persist.mock.calls).toEqual([[true], [false]]);
      });
    } finally {
      scope.stop();
    }
  });

  it('resets each mobile visit synchronously and disposes its watcher', () => {
    const scope = effectScope();
    const mobile = ref(true);
    const preference = ref(false);
    const persist = vi.fn();
    const collapsed = scope.run(() =>
      useSidebarCollapse(
        mobile,
        computed({ get: () => preference.value, set: persist }),
      ),
    );
    if (!collapsed) throw new Error('sidebar scope did not initialize');
    try {
      expect(collapsed.value).toBe(true);
      collapsed.value = false;
      mobile.value = false;
      mobile.value = true;
      expect(collapsed.value).toBe(true);
      collapsed.value = false;
      scope.stop();
      mobile.value = false;
      mobile.value = true;
      expect(collapsed.value).toBe(false);
      expect(persist).not.toHaveBeenCalled();
    } finally {
      scope.stop();
    }
  });
});
