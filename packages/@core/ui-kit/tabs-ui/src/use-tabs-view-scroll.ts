import type { Ref } from 'vue';

import type { VbenScrollbar } from '@vben-core/shadcn-ui';

import type { TabsProps } from './types';

import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import { useDebounceFn, usePreferredReducedMotion } from '@vueuse/core';

type DomElement = Element | null | undefined;

export function useTabsViewScroll(
  props: TabsProps,
  tabsHostRef: Readonly<Ref<HTMLElement | null>>,
) {
  let resizeObserver: null | ResizeObserver = null;
  let mutationObserver: MutationObserver | null = null;
  let tabItemCount = 0;
  let disposed = false;
  let revealFrame: number | undefined;
  let visibilityFrame: number | undefined;
  const reducedMotion = usePreferredReducedMotion();
  const scrollBehavior = computed(() =>
    reducedMotion.value === 'reduce' ? 'instant' : 'smooth',
  );
  const scrollbarRef = ref<InstanceType<typeof VbenScrollbar> | null>(null);
  const scrollViewportEl = ref<DomElement>(null);
  const showScrollButton = ref(false);
  const scrollIsAtLeft = ref(true);
  const scrollIsAtRight = ref(false);

  function getScrollClientWidth() {
    const scrollbarEl = scrollbarRef.value?.$el;
    if (!scrollbarEl || !scrollViewportEl.value) return {};

    const scrollbarWidth = scrollbarEl.clientWidth;
    const scrollViewWidth = scrollViewportEl.value.clientWidth;

    return {
      scrollbarWidth,
      scrollViewWidth,
    };
  }

  function scrollDirection(
    direction: 'left' | 'right',
    distance: number = 150,
  ) {
    const { scrollbarWidth, scrollViewWidth } = getScrollClientWidth();

    if (!scrollbarWidth || !scrollViewWidth) return;

    if (scrollbarWidth > scrollViewWidth) return;

    scrollViewportEl.value?.scrollBy({
      behavior: scrollBehavior.value,
      left:
        direction === 'left'
          ? -(scrollbarWidth - distance)
          : +(scrollbarWidth - distance),
    });
  }

  async function initScrollbar() {
    await nextTick();

    if (disposed) return;

    const scrollbarEl = scrollbarRef.value?.$el;
    const hostEl = tabsHostRef.value;
    if (!scrollbarEl || !hostEl) {
      return;
    }

    const viewportEl = scrollbarEl?.querySelector(
      'div[data-reka-scroll-area-viewport]',
    );
    if (!viewportEl) return;

    scrollViewportEl.value = viewportEl;
    scheduleVisibility();

    await nextTick();
    if (
      disposed ||
      scrollViewportEl.value !== viewportEl ||
      tabsHostRef.value !== hostEl
    )
      return;
    scrollToActiveIntoView();

    resizeObserver?.disconnect();
    const railObserver = new ResizeObserver(() => {
      if (
        resizeObserver !== railObserver ||
        disposed ||
        scrollViewportEl.value !== viewportEl ||
        tabsHostRef.value !== hostEl
      )
        return;
      revealActive(viewportEl);
      scheduleVisibility();
    });
    resizeObserver = railObserver;
    railObserver.observe(viewportEl);
    railObserver.observe(hostEl);

    tabItemCount = props.tabs?.length || 0;
    mutationObserver?.disconnect();
    const childrenObserver = new MutationObserver(() => {
      if (
        mutationObserver !== childrenObserver ||
        disposed ||
        scrollViewportEl.value !== viewportEl ||
        tabsHostRef.value !== hostEl
      )
        return;
      const count = viewportEl.querySelectorAll(
        `div[data-tab-item="true"]`,
      ).length;

      if (count > tabItemCount) {
        scrollToActiveIntoView();
      }

      if (count !== tabItemCount) {
        scheduleVisibility();
        tabItemCount = count;
      }
    });

    mutationObserver = childrenObserver;
    childrenObserver.observe(viewportEl, {
      attributes: false,
      childList: true,
      subtree: true,
    });
  }

  async function scrollToActiveIntoView() {
    await nextTick();
    if (disposed) return;
    const viewportEl = scrollViewportEl.value;
    const hostEl = tabsHostRef.value;
    if (revealFrame !== undefined) cancelAnimationFrame(revealFrame);
    revealFrame = undefined;
    if (!viewportEl || !hostEl) return;

    const frame = requestAnimationFrame(() => {
      if (revealFrame !== frame) return;
      revealFrame = undefined;
      if (tabsHostRef.value !== hostEl) return;
      revealActive(viewportEl);
    });
    revealFrame = frame;
  }

  function revealActive(viewportEl: Element) {
    const hostEl = tabsHostRef.value;
    if (
      disposed ||
      scrollViewportEl.value !== viewportEl ||
      !viewportEl.isConnected ||
      !hostEl?.isConnected ||
      hostEl.clientWidth <= 0
    )
      return;
    const activeItem = viewportEl.querySelector('.is-active');
    if (!activeItem || viewportEl.clientWidth <= 0) return;
    const rail = viewportEl.getBoundingClientRect();
    const item = activeItem.getBoundingClientRect();
    const leftEdge = rail.left + viewportEl.clientLeft;
    const target = Math.min(
      Math.max(0, viewportEl.scrollLeft + item.left - leftEdge),
      Math.max(0, viewportEl.scrollWidth - viewportEl.clientWidth),
    );
    const left = target - viewportEl.scrollLeft;
    // Resize delivery must repair native scroll clamping before this frame paints.
    // Scroll only this rail; unchanged geometry never starts another scroll.
    if (left !== 0)
      viewportEl.scrollBy({ behavior: scrollBehavior.value, left });
  }

  function scheduleVisibility() {
    if (visibilityFrame !== undefined) cancelAnimationFrame(visibilityFrame);
    visibilityFrame = undefined;
    const viewportEl = scrollViewportEl.value;
    const hostEl = tabsHostRef.value;
    if (disposed || !viewportEl || !hostEl) return;

    const frame = requestAnimationFrame(() => {
      if (visibilityFrame !== frame) return;
      visibilityFrame = undefined;
      if (
        disposed ||
        scrollViewportEl.value !== viewportEl ||
        tabsHostRef.value !== hostEl ||
        !viewportEl.isConnected ||
        !hostEl.isConnected ||
        hostEl.clientWidth <= 0
      )
        return;
      // Visibility changes the observed rail width, so publish outside RO.
      // The host includes control space and does not depend on arrow visibility.
      showScrollButton.value = viewportEl.scrollWidth > hostEl.clientWidth;
    });
    visibilityFrame = frame;
  }

  const handleScrollAt = useDebounceFn(({ left, right }) => {
    scrollIsAtLeft.value = left;
    scrollIsAtRight.value = right;
  }, 100);

  function handleWheel({ deltaY }: WheelEvent) {
    scrollViewportEl.value?.scrollBy({
      // behavior: 'smooth',
      left: deltaY * 3,
    });
  }

  watch(() => props.active, scrollToActiveIntoView, {
    flush: 'post',
  });

  watch(
    () => props.styleType,
    () => {
      initScrollbar();
    },
  );

  onMounted(initScrollbar);

  onUnmounted(() => {
    disposed = true;
    if (revealFrame !== undefined) cancelAnimationFrame(revealFrame);
    if (visibilityFrame !== undefined) cancelAnimationFrame(visibilityFrame);
    revealFrame = undefined;
    visibilityFrame = undefined;
    scrollViewportEl.value = null;
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    resizeObserver = null;
    mutationObserver = null;
  });

  return {
    handleScrollAt,
    handleWheel,
    initScrollbar,
    scrollbarRef,
    scrollDirection,
    scrollIsAtLeft,
    scrollIsAtRight,
    showScrollButton,
  };
}
