import type { Ref, WritableComputedRef } from 'vue';

import { computed, ref, watch } from 'vue';

/** Keep responsive drawer visibility out of the user's desktop preference. */
export function useSidebarCollapse(
  isMobile: Readonly<Ref<boolean>>,
  desktopCollapsed: WritableComputedRef<boolean>,
) {
  const mobileCollapsed = ref(true);
  watch(
    isMobile,
    (mobile) => {
      if (mobile) mobileCollapsed.value = true;
    },
    { flush: 'sync' },
  );

  return computed({
    get: () =>
      isMobile.value ? mobileCollapsed.value : desktopCollapsed.value,
    set: (collapsed: boolean) => {
      if (isMobile.value) {
        mobileCollapsed.value = collapsed;
      } else {
        desktopCollapsed.value = collapsed;
      }
    },
  });
}
