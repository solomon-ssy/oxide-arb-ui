<script lang="ts" setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  useTemplateRef,
  watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import {
  Alert,
  Button,
  Drawer,
  Empty,
  Skeleton,
  Splitter,
  SplitterPanel,
} from 'antdv-next';

import { $t } from '#/locales';

defineOptions({ name: 'ObjectInspector' });

const props = withDefaults(
  defineProps<{
    entity: string;
    errorMessage?: null | string;
    id?: null | string;
    loading?: boolean;
    notFound?: boolean;
    storageKey?: string;
    title: string;
  }>(),
  {
    errorMessage: null,
    id: null,
    loading: false,
    notFound: false,
    storageKey: 'qp.object-inspector.width',
  },
);

const open = defineModel<boolean>('open', { default: false });
const route = useRoute();
const router = useRouter();
const panel = useTemplateRef<HTMLElement>('panel');
const desktop = ref(false);
const width = ref(440);
let restoreFocus: HTMLElement | null = null;
let media: MediaQueryList | undefined;

const visibleFromRoute = computed(
  () => route.query.entity === props.entity && route.query.id === props.id,
);

function syncViewport() {
  desktop.value = media?.matches ?? false;
}

function close() {
  open.value = false;
  const query = { ...route.query };
  delete query.entity;
  delete query.id;
  void router.replace({ query });
}

function onResizeEnd(sizes: number[]) {
  const next = sizes.at(-1);
  if (!next || next < 320) return;
  width.value = Math.round(next);
  localStorage.setItem(props.storageKey, String(width.value));
}

function trapKeyboard(event: KeyboardEvent) {
  if (!open.value || !desktop.value) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    close();
    return;
  }
  if (event.key !== 'Tab' || !panel.value) return;
  const focusable = [
    ...panel.value.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ];
  if (focusable.length === 0) {
    event.preventDefault();
    panel.value.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

watch(
  visibleFromRoute,
  (visible) => {
    open.value = visible;
  },
  { immediate: true },
);

watch(open, async (visible) => {
  if (visible) {
    restoreFocus = document.activeElement as HTMLElement | null;
    await nextTick();
    panel.value?.focus();
  } else {
    restoreFocus?.focus();
    restoreFocus = null;
  }
});

if (typeof window !== 'undefined') {
  const saved = Number(localStorage.getItem(props.storageKey));
  if (Number.isFinite(saved) && saved >= 320 && saved <= 760)
    width.value = saved;
  media = window.matchMedia('(min-width: 1024px)');
  syncViewport();
  media.addEventListener('change', syncViewport);
  window.addEventListener('keydown', trapKeyboard);
}

onBeforeUnmount(() => {
  media?.removeEventListener('change', syncViewport);
  window.removeEventListener('keydown', trapKeyboard);
});
</script>

<template>
  <Splitter
    v-if="desktop && open"
    class="object-inspector-splitter"
    @resize-end="onResizeEnd"
  >
    <SplitterPanel min="320">
      <slot name="workspace"></slot>
    </SplitterPanel>
    <SplitterPanel :max="760" :min="360" :size="width">
      <aside
        ref="panel"
        :aria-label="title"
        class="object-inspector-panel"
        tabindex="-1"
      >
        <div class="object-inspector-toolbar">
          <span>{{ title }}</span>
          <Button
            :aria-label="$t('page.common.close')"
            shape="circle"
            type="text"
            @click="close"
          >
            <IconifyIcon icon="lucide:x" />
          </Button>
        </div>
        <Skeleton v-if="loading" active />
        <Alert
          v-else-if="errorMessage"
          :message="errorMessage"
          show-icon
          type="error"
        />
        <Empty v-else-if="notFound" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
        <div v-else class="object-inspector-content">
          <slot></slot>
        </div>
      </aside>
    </SplitterPanel>
  </Splitter>
  <template v-else>
    <slot name="workspace"></slot>
    <Drawer
      v-if="!desktop"
      :open="open"
      placement="right"
      :title="title"
      :size="Math.min(width, 440)"
      @close="close"
    >
      <Skeleton v-if="loading" active />
      <Alert
        v-else-if="errorMessage"
        :message="errorMessage"
        show-icon
        type="error"
      />
      <Empty v-else-if="notFound" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
      <div v-else class="object-inspector-content">
        <slot></slot>
      </div>
    </Drawer>
  </template>
</template>

<style scoped>
.object-inspector-splitter {
  flex: 1;
  min-height: 0;
}

.object-inspector-panel {
  height: 100%;
  overflow: hidden;
  background: hsl(var(--qp-surface-glass) / 88%);
  border-left: 1px solid hsl(var(--qp-border-subtle));
  backdrop-filter: blur(18px);
}

.object-inspector-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 720;
  color: hsl(var(--qp-text-secondary));
  border-bottom: 1px solid hsl(var(--qp-border-subtle));
}

.object-inspector-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  padding: var(--qp-density-card-padding);
  overflow-y: auto;
}
</style>
