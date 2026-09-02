import type { App } from 'vue';

import { createApp, nextTick, reactive, ref } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTabsViewScroll } from './use-tabs-view-scroll';

const motion = ref<'no-preference' | 'reduce'>('reduce');
vi.mock('@vueuse/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  usePreferredReducedMotion: () => motion,
}));

const frames = new Map<number, FrameRequestCallback>();
const apps = new Set<App>();
let sequence = 0;
const resizeCallbacks: ResizeObserverCallback[] = [];
const resizeTargets: Element[] = [];
const disconnect = vi.fn();

beforeEach(() => {
  motion.value = 'reduce';
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = ++sequence;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect = disconnect;
      constructor(callback: ResizeObserverCallback) {
        resizeCallbacks.push(callback);
      }
      observe(target: Element) {
        resizeTargets.push(target);
      }
    },
  );
});

afterEach(() => {
  for (const app of apps) app.unmount();
  apps.clear();
  frames.clear();
  resizeCallbacks.length = 0;
  resizeTargets.length = 0;
  disconnect.mockClear();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function flushFrame() {
  const pending = [...frames.values()];
  frames.clear();
  for (const callback of pending) callback(0);
}

async function mountedRail({
  width = 300,
  hostWidth = width,
  contentWidth = 900,
  left = 100,
  itemWidth = 100,
} = {}) {
  const host = document.createElement('div');
  const tabsHost = document.createElement('div');
  const shell = document.createElement('div');
  const viewport = document.createElement('div');
  viewport.dataset.rekaScrollAreaViewport = '';
  const active = document.createElement('div');
  active.className = 'is-active';
  active.dataset.tabItem = 'true';
  viewport.append(active);
  shell.append(viewport);
  tabsHost.append(shell);
  document.body.append(host, tabsHost);
  let railWidth = width;
  let availableWidth = hostWidth;
  let railLeft = left;
  Object.defineProperties(shell, { clientWidth: { get: () => railWidth } });
  Object.defineProperties(tabsHost, {
    clientWidth: { get: () => availableWidth },
  });
  Object.defineProperties(viewport, {
    clientWidth: { get: () => railWidth },
    scrollWidth: { value: contentWidth },
    clientLeft: { value: 0 },
  });
  let itemLeft = 500;
  vi.spyOn(viewport, 'getBoundingClientRect').mockImplementation(
    () => new DOMRect(railLeft, 20, railWidth, 40),
  );
  vi.spyOn(active, 'getBoundingClientRect').mockImplementation(
    () => new DOMRect(itemLeft, 20, itemWidth, 40),
  );
  const scroll = vi.fn((options: ScrollToOptions) => {
    itemLeft -= options.left ?? 0;
    viewport.scrollLeft += options.left ?? 0;
  });
  viewport.scrollBy = scroll;
  active.scrollIntoView = vi.fn();
  const props = reactive({ active: 'first', styleType: 'chrome' as const });
  const tabsHostRef = ref<HTMLElement | null>(tabsHost);
  let hook: ReturnType<typeof useTabsViewScroll> | undefined;
  const app = createApp({
    setup() {
      hook = useTabsViewScroll(props, tabsHostRef);
      hook.scrollbarRef.value = { $el: shell } as NonNullable<
        typeof hook.scrollbarRef.value
      >;
      return () => null;
    },
  });
  apps.add(app);
  app.mount(host);
  await nextTick();
  await nextTick();
  if (!hook) throw new Error('tabs hook did not mount');
  return {
    active,
    app,
    hook,
    props,
    scroll,
    tabsHost,
    tabsHostRef,
    viewport,
    resize: (width: number, left: number, hostWidth = width) => {
      railWidth = width;
      availableWidth = hostWidth;
      railLeft = left;
    },
    moveActive: (left: number) => {
      itemLeft = left;
    },
  };
}

describe('tab rail scrolling', () => {
  it.each(['reduce', 'no-preference'] as const)(
    'honors %s for reveal and direction controls',
    async (preference) => {
      motion.value = preference;
      const rail = await mountedRail();
      flushFrame();
      const behavior = preference === 'reduce' ? 'instant' : 'smooth';
      expect(rail.scroll).toHaveBeenLastCalledWith({ behavior, left: 400 });
      rail.hook.scrollDirection('right');
      expect(rail.scroll).toHaveBeenLastCalledWith({ behavior, left: 150 });
      rail.hook.scrollDirection('left');
      expect(rail.scroll).toHaveBeenLastCalledWith({ behavior, left: -150 });
    },
  );

  it('reveals the active item within the rail without scrolling page ancestors', async () => {
    const rail = await mountedRail();
    const pageScroll = vi.spyOn(window, 'scrollTo');
    flushFrame();
    expect(rail.active.getBoundingClientRect().left).toBe(100);
    rail.props.active = 'already-visible';
    await nextTick();
    await nextTick();
    flushFrame();
    expect(rail.scroll).toHaveBeenCalledTimes(1);
    rail.moveActive(40);
    rail.props.active = 'left';
    await nextTick();
    await nextTick();
    flushFrame();
    expect(rail.scroll).toHaveBeenLastCalledWith({
      behavior: 'instant',
      left: -60,
    });
    expect(rail.active.getBoundingClientRect().left).toBe(100);
    expect(rail.active.scrollIntoView).not.toHaveBeenCalled();
    expect(pageScroll).not.toHaveBeenCalled();
  });

  it('rechecks current geometry after a viewport resize', async () => {
    const rail = await mountedRail();
    flushFrame();
    rail.moveActive(450);
    for (const callback of resizeCallbacks) callback([], {} as ResizeObserver);
    expect(rail.scroll).toHaveBeenLastCalledWith({
      behavior: 'instant',
      left: 200,
    });
    expect(rail.active.getBoundingClientRect().right).toBeLessThanOrEqual(400);
  });

  it('repairs reduced-motion native clamping before resize delivery returns', async () => {
    const rail = await mountedRail({
      width: 1051,
      contentWidth: 1568,
      left: 257,
      itemWidth: 136,
    });
    flushFrame();
    rail.scroll.mockClear();
    const callback = resizeCallbacks[0];
    if (!callback) throw new Error('resize observer is missing');
    rail.resize(0, 257);
    callback([], {} as ResizeObserver);
    expect(rail.scroll).not.toHaveBeenCalled();
    rail.resize(1341, 33);
    rail.viewport.scrollLeft = 227;
    rail.moveActive(1226);
    callback([], {} as ResizeObserver);
    expect(rail.scroll).not.toHaveBeenCalled();
    rail.resize(1051, 257);
    rail.moveActive(1450);
    callback([], {} as ResizeObserver);
    expect(rail.viewport.scrollLeft).toBe(517);
    expect(rail.scroll).toHaveBeenLastCalledWith({
      behavior: 'instant',
      left: 290,
    });
    expect(rail.active.getBoundingClientRect().right).toBe(1296);
    expect(frames.size).toBe(1);
    callback([], {} as ResizeObserver);
    callback([], {} as ResizeObserver);
    expect(rail.scroll).toHaveBeenCalledTimes(1);
    rail.resize(900, 257);
    callback([], {} as ResizeObserver);
    expect(rail.viewport.scrollLeft).toBe(668);
    rail.app.unmount();
    apps.delete(rail.app);
    rail.moveActive(2000);
    callback([], {} as ResizeObserver);
    expect(rail.scroll).toHaveBeenCalledTimes(2);
  });

  it('requests smooth resize repair without promising immediate arrival', async () => {
    motion.value = 'no-preference';
    const rail = await mountedRail({
      width: 1051,
      contentWidth: 1568,
      left: 257,
      itemWidth: 136,
    });
    flushFrame();
    rail.scroll.mockClear();
    rail.viewport.scrollLeft = 227;
    rail.moveActive(1450);
    const callback = resizeCallbacks[0];
    if (!callback) throw new Error('resize observer is missing');
    callback([], {} as ResizeObserver);
    expect(rail.scroll).toHaveBeenCalledExactlyOnceWith({
      behavior: 'smooth',
      left: 290,
    });
    expect(frames.size).toBe(1);
  });

  it('cancels both frame owners and observers on unmount', async () => {
    const rail = await mountedRail();
    expect(frames.size).toBe(2);
    const staleFrames = [...frames.values()];
    rail.app.unmount();
    apps.delete(rail.app);
    expect(frames.size).toBe(0);
    for (const callback of staleFrames) callback(0);
    flushFrame();
    await vi.advanceTimersByTimeAsync(100);
    expect(rail.scroll).not.toHaveBeenCalled();
    expect(rail.hook.showScrollButton.value).toBe(false);
    expect(disconnect).toHaveBeenCalled();
  });

  it('does not reveal through a replaced viewport', async () => {
    const rail = await mountedRail();
    const staleFrames = [...frames.values()];
    expect(staleFrames).toHaveLength(2);
    const staleResize = resizeCallbacks[0];
    if (!staleResize) throw new Error('initial resize observer is missing');
    const replacement = document.createElement('div');
    replacement.innerHTML = '<div data-reka-scroll-area-viewport></div>';
    document.body.append(replacement);
    rail.hook.scrollbarRef.value = {
      $el: replacement,
    } as NonNullable<typeof rail.hook.scrollbarRef.value>;
    await rail.hook.initScrollbar();
    await nextTick();
    staleResize([], {} as ResizeObserver);
    expect(rail.scroll).not.toHaveBeenCalled();
    for (const callback of staleFrames) callback(0);
    expect(rail.hook.showScrollButton.value).toBe(false);
    rail.app.unmount();
    apps.delete(rail.app);
    expect(frames.size).toBe(0);
    flushFrame();
    expect(rail.scroll).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
  });

  it('publishes visibility outside resize delivery using the full host width', async () => {
    const rail = await mountedRail({
      width: 134,
      hostWidth: 200,
      contentWidth: 258,
    });
    expect(rail.hook.showScrollButton.value).toBe(false);
    flushFrame();
    expect(rail.hook.showScrollButton.value).toBe(true);
    expect(resizeTargets).toContain(rail.viewport);
    expect(resizeTargets).toContain(rail.tabsHost);
    const callback = resizeCallbacks[0];
    if (!callback) throw new Error('resize observer is missing');
    rail.resize(239, 100, 305);
    callback([], {} as ResizeObserver);
    expect(rail.hook.showScrollButton.value).toBe(true);
    expect(frames.size).toBe(1);
    flushFrame();
    expect(rail.hook.showScrollButton.value).toBe(false);
    expect(frames.size).toBe(0);
  });

  it('coalesces visibility frames and ignores superseded callbacks', async () => {
    const rail = await mountedRail({
      width: 134,
      hostWidth: 200,
      contentWidth: 258,
    });
    flushFrame();
    expect(rail.hook.showScrollButton.value).toBe(true);
    const callback = resizeCallbacks[0];
    if (!callback) throw new Error('resize observer is missing');
    rail.resize(100, 100, 166);
    callback([], {} as ResizeObserver);
    const staleFrame = [...frames.values()][0];
    if (!staleFrame) throw new Error('visibility frame is missing');
    rail.resize(200, 100, 266);
    callback([], {} as ResizeObserver);
    rail.resize(239, 100, 305);
    callback([], {} as ResizeObserver);
    expect(frames.size).toBe(1);
    staleFrame(0);
    expect(rail.hook.showScrollButton.value).toBe(true);
    expect(frames.size).toBe(1);
    flushFrame();
    expect(rail.hook.showScrollButton.value).toBe(false);
  });

  it('preserves hidden-host state and recovers an arrow-collapsed viewport', async () => {
    const rail = await mountedRail({
      width: 134,
      hostWidth: 200,
      contentWidth: 258,
    });
    flushFrame();
    const callback = resizeCallbacks[0];
    if (!callback) throw new Error('resize observer is missing');
    rail.resize(239, 100, 0);
    callback([], {} as ResizeObserver);
    flushFrame();
    expect(rail.hook.showScrollButton.value).toBe(true);
    rail.resize(0, 100, 305);
    callback([], {} as ResizeObserver);
    expect(rail.hook.showScrollButton.value).toBe(true);
    flushFrame();
    expect(rail.hook.showScrollButton.value).toBe(false);
    rail.resize(239, 100, 305);
    callback([], {} as ResizeObserver);
    flushFrame();
    expect(rail.hook.showScrollButton.value).toBe(false);
  });

  it('ignores both frames and resize delivery after the host is replaced', async () => {
    const rail = await mountedRail();
    const staleFrames = [...frames.values()];
    const callback = resizeCallbacks[0];
    if (!callback) throw new Error('resize observer is missing');
    const replacement = document.createElement('div');
    Object.defineProperty(replacement, 'clientWidth', { value: 900 });
    document.body.append(replacement);
    rail.tabsHostRef.value = replacement;
    callback([], {} as ResizeObserver);
    for (const frame of staleFrames) frame(0);
    expect(rail.hook.showScrollButton.value).toBe(false);
    expect(rail.scroll).not.toHaveBeenCalled();
  });
});
