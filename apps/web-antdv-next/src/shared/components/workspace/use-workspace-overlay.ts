import type { ComponentPublicInstance, Ref } from 'vue';

import type { WorkspaceSurface } from './workspace-inspector-registry';

import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  ref,
  useId,
  watch,
} from 'vue';

import { useEventListener } from '@vueuse/core';
import { useReducedMotion } from 'motion-v';

import { WORKSPACE_INSPECTOR_HOST_KEY } from './workspace-inspector-host.types';

const EXIT_MS = 750;

interface DrawerState {
  isOpen?: boolean;
}

export interface InspectorDrawerApi {
  close: () => void;
  useStore: <T = DrawerState>(
    selector?: (state: DrawerState) => T,
  ) => Readonly<Ref<T>>;
}

export interface WorkspaceOverlayOptions {
  drawerApi?: InspectorDrawerApi;
  emitClose?: () => void;
  openModel: Ref<boolean>;
  surface: WorkspaceSurface;
}

export function useWorkspaceOverlay(options: WorkspaceOverlayOptions) {
  const host = inject(WORKSPACE_INSPECTOR_HOST_KEY, null);
  const drawerState = options.drawerApi?.useStore();
  const reducedMotion = useReducedMotion();
  const panel = ref<HTMLElement | null>(null);
  const layerMounted = ref(false);
  const workspaceDomain = ref<string | undefined>();
  const surfaceId = useId();
  const open = computed(() =>
    options.drawerApi
      ? Boolean(drawerState?.value.isOpen)
      : options.openModel.value,
  );
  const quietMotion = computed(
    () =>
      Boolean(reducedMotion.value) ||
      document.documentElement.dataset.uiDeterministic === 'true',
  );
  const stageTarget = computed(() => host?.stageTarget.value ?? null);
  let deactivateTimer: ReturnType<typeof setTimeout> | undefined;
  let restoreFocus: HTMLElement | null = null;

  function syncWorkspaceDomain() {
    workspaceDomain.value =
      document.querySelector<HTMLElement>('.workspace-shell')?.dataset.domain;
  }

  function popupContainer(trigger?: HTMLElement) {
    return panel.value ?? trigger?.parentElement ?? document.body;
  }

  function focusAfterClose() {
    const original =
      restoreFocus?.isConnected && restoreFocus !== document.body
        ? restoreFocus
        : null;
    const fallback =
      document.querySelector<HTMLElement>(
        '.workspace-tabs [role="tab"][aria-selected="true"]',
      ) ?? document.querySelector<HTMLElement>('.workspace-hero h1');
    (original ?? fallback)?.focus();
    restoreFocus = null;
  }

  function close() {
    if (options.drawerApi) {
      options.drawerApi.close();
    } else {
      options.openModel.value = false;
    }
    options.emitClose?.();
  }

  function setPanelRef(value: ComponentPublicInstance | Element | null) {
    const element = value instanceof Element ? value : value?.$el;
    panel.value = element instanceof HTMLElement ? element : null;
  }

  function deactivateAfterExit() {
    if (deactivateTimer) clearTimeout(deactivateTimer);
    const delay = quietMotion.value ? 0 : EXIT_MS;
    deactivateTimer = setTimeout(() => {
      host?.deactivate(surfaceId);
      layerMounted.value = false;
      deactivateTimer = undefined;
    }, delay);
  }

  function onEscape(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !open.value) return;
    event.preventDefault();
    close();
  }

  watch(
    open,
    async (visible, wasOpen) => {
      if (!visible) {
        if (wasOpen) {
          deactivateAfterExit();
          await nextTick();
          focusAfterClose();
        }
        return;
      }

      if (deactivateTimer) {
        clearTimeout(deactivateTimer);
        deactivateTimer = undefined;
      }
      restoreFocus = document.activeElement as HTMLElement | null;
      layerMounted.value = true;
      syncWorkspaceDomain();
      host?.activate(surfaceId, close, options.surface);
      await nextTick();
      await nextTick();
      panel.value?.focus();
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    if (deactivateTimer) clearTimeout(deactivateTimer);
    host?.deactivate(surfaceId);
    if (restoreFocus) {
      focusAfterClose();
    }
  });

  useEventListener(window, 'keydown', onEscape);

  return {
    close,
    layerMounted,
    open,
    panel,
    popupContainer,
    quietMotion,
    setPanelRef,
    stageTarget,
    workspaceDomain,
  };
}
