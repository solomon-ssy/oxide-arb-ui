<script lang="ts" setup>
import type { InputRef } from 'antdv-next';

import type { MenuTreeNode } from '@vben/types';

import { computed, nextTick, onMounted, onScopeDispose, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import { Empty, Input, Listy, Modal, Tag, Tooltip } from 'antdv-next';

import { $t } from '#/locales';
import { useAuthStore } from '#/store/auth';

defineOptions({ name: 'CommandPalette' });

interface PaletteModule {
  icon: string;
  label: string;
  module: string;
}

interface PaletteResult {
  description: string;
  icon: string;
  key: string;
  label: string;
  path: string;
  query?: Record<string, string>;
  type: 'action' | 'module' | 'page';
}

const MODULES: Record<string, PaletteModule[]> = {
  'execution-orders': [
    module('intents', 'lucide:file-input'),
    module('approvals', 'lucide:badge-check'),
    module('orders', 'lucide:route'),
    module('flow', 'lucide:git-branch'),
  ],
  'execution-portfolio': [
    module('account', 'lucide:landmark'),
    module('positions', 'lucide:briefcase-business'),
    module('exposure', 'lucide:gauge'),
    module('equity', 'lucide:chart-spline'),
  ],
  'execution-post-trade': [
    module('reconciliation', 'lucide:git-compare-arrows'),
    module('settlement', 'lucide:badge-dollar-sign'),
    module('actions', 'lucide:shield-check'),
  ],
  'market-intelligence': [
    module('overview', 'lucide:radar'),
    module('live', 'lucide:radio-tower'),
    module('structure', 'lucide:network'),
  ],
  recommendations: [
    module('reports', 'lucide:file-chart-column'),
    module('queue', 'lucide:list-restart'),
    module('funnel', 'lucide:funnel'),
    module('diff', 'lucide:git-compare'),
  ],
  'research-data-reliability': [
    module('sources', 'lucide:database-zap'),
    module('linkages', 'lucide:link-2'),
    module('basis-alerts', 'lucide:triangle-alert'),
    module('feature-integrity', 'lucide:shield-check'),
  ],
  'research-lab': [
    module('lineage', 'lucide:workflow'),
    module('specs', 'lucide:braces'),
    module('datasets', 'lucide:database'),
    module('factors', 'lucide:sigma'),
    module('models', 'lucide:brain-circuit'),
    module('evaluation', 'lucide:chart-no-axes-combined'),
  ],
  'research-learning-policy': [
    module('policies', 'lucide:route'),
    module('fits', 'lucide:wand-sparkles'),
    module('feedback', 'lucide:refresh-ccw-dot'),
    module('calibration', 'lucide:sliders-horizontal'),
  ],
  'system-audit': [
    module('operations', 'lucide:scroll-text'),
    module('receipts', 'lucide:receipt-text'),
    module('entity-timeline', 'lucide:history'),
  ],
  'system-config': [
    module('runtime', 'lucide:toggle-right'),
    module('deploy', 'lucide:server-cog'),
    module('policy', 'lucide:file-cog'),
    module('history', 'lucide:history'),
  ],
};

const router = useRouter();
const authStore = useAuthStore();
const open = ref(false);
const query = ref('');
const selectedIndex = ref(0);
const inputRef = ref<InputRef>();

const allResults = computed(() => flattenMenus(authStore.cachedMenus ?? []));
const results = computed(() => {
  const needle = normalize(query.value);
  if (!needle) return allResults.value;
  return allResults.value.filter((result) =>
    normalize(
      `${result.label} ${result.description} ${result.key} ${result.path}`,
    ).includes(needle),
  );
});

function module(name: string, icon: string): PaletteModule {
  return {
    icon,
    label: `page.commandPalette.module.${name}`,
    module: name,
  };
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function flattenMenus(nodes: MenuTreeNode[]) {
  const results: PaletteResult[] = [];
  for (const node of nodes) {
    if (node.status !== 'enabled') continue;
    if (node.kind === 'directory') {
      results.push(...flattenMenus(node.children));
      continue;
    }
    if (node.kind !== 'menu' || !node.path) continue;
    const pageLabel = $t(node.title);
    results.push({
      description: node.permission_code ?? $t('page.commandPalette.navigation'),
      icon: node.icon ?? 'lucide:panel-top',
      key: `page:${node.name}`,
      label: pageLabel,
      path: node.path,
      type: 'page',
    });
    for (const item of MODULES[node.name] ?? []) {
      results.push({
        description: pageLabel,
        icon: item.icon,
        key: `module:${node.name}:${item.module}`,
        label: $t(item.label),
        path: node.path,
        query: { module: item.module },
        type: 'module',
      });
    }
    for (const action of node.children.filter(
      (child) => child.kind === 'button' && child.status === 'enabled',
    )) {
      results.push({
        description: `${pageLabel} · ${action.permission_code ?? ''}`,
        icon: 'lucide:play',
        key: `action:${node.name}:${action.name}`,
        label: $t(action.title),
        path: node.path,
        type: 'action',
      });
    }
  }
  return results;
}

function openPalette() {
  open.value = true;
  void nextTick(() => inputRef.value?.focus());
}

function closePalette() {
  open.value = false;
  query.value = '';
}

function select(result: PaletteResult) {
  closePalette();
  void router.push({ path: result.path, query: result.query });
}

function selectAt(index: number) {
  const result = results.value[index];
  if (result) select(result);
}

function resultIndex(result: PaletteResult) {
  return results.value.findIndex((item) => item.key === result.key);
}

function onPaletteKeydown(event: KeyboardEvent) {
  if (results.value.length === 0) return;
  switch (event.key) {
    case 'ArrowDown': {
      event.preventDefault();
      selectedIndex.value = (selectedIndex.value + 1) % results.value.length;

      break;
    }
    case 'ArrowUp': {
      event.preventDefault();
      selectedIndex.value =
        (selectedIndex.value - 1 + results.value.length) % results.value.length;

      break;
    }
    case 'Enter': {
      event.preventDefault();
      selectAt(selectedIndex.value);

      break;
    }
    // No default
  }
}

function resultIcon(result: PaletteResult) {
  return result.icon;
}

function onKeydown(event: KeyboardEvent) {
  if (
    (event.metaKey || event.ctrlKey) &&
    event.key.toLocaleLowerCase() === 'k'
  ) {
    event.preventDefault();
    open.value ? closePalette() : openPalette();
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onScopeDispose(() => window.removeEventListener('keydown', onKeydown));
watch([query, allResults], () => {
  selectedIndex.value = 0;
});
</script>

<template>
  <Tooltip :title="$t('page.commandPalette.open')">
    <button
      :aria-label="$t('page.commandPalette.open')"
      class="palette-trigger"
      data-testid="command-palette-trigger"
      type="button"
      @click="openPalette"
    >
      <IconifyIcon icon="lucide:search" />
      <kbd>⌘K</kbd>
    </button>
  </Tooltip>

  <Modal
    v-model:open="open"
    class="command-palette"
    :closable="false"
    :footer="null"
    :width="680"
    @cancel="closePalette"
  >
    <div class="palette-search">
      <IconifyIcon icon="lucide:search" />
      <Input
        ref="inputRef"
        v-model:value="query"
        allow-clear
        :bordered="false"
        :placeholder="$t('page.commandPalette.placeholder')"
        size="large"
        @keydown="onPaletteKeydown"
      />
      <kbd>ESC</kbd>
    </div>

    <Empty
      v-if="results.length === 0"
      class="palette-empty"
      :description="$t('page.commandPalette.empty')"
    />
    <Listy
      v-else
      :height="420"
      :items="results"
      :row-key="(item: PaletteResult) => item.key"
      root-class="palette-results"
      virtual
    >
      <template #itemRender="item">
        <button
          :aria-selected="resultIndex(item) === selectedIndex"
          class="palette-result"
          :class="{ active: resultIndex(item) === selectedIndex }"
          role="option"
          type="button"
          @click="select(item)"
          @mouseenter="selectedIndex = resultIndex(item)"
        >
          <span class="palette-result-icon">
            <IconifyIcon :icon="resultIcon(item)" />
          </span>
          <span class="palette-result-copy">
            <strong>{{ item.label }}</strong>
            <small>{{ item.description }}</small>
          </span>
          <Tag>{{ $t(`page.commandPalette.type.${item.type}`) }}</Tag>
          <IconifyIcon class="palette-arrow" icon="lucide:corner-down-left" />
        </button>
      </template>
    </Listy>

    <div class="palette-footer">
      <span>{{ $t('page.commandPalette.permissionHint') }}</span>
      <span>
        <kbd>↑</kbd><kbd>↓</kbd>
        <span>{{ $t('page.commandPalette.navigateHint') }}</span>
      </span>
    </div>
  </Modal>
</template>

<style scoped>
.palette-trigger {
  display: inline-flex;
  gap: 7px;
  place-items: center;
  height: 34px;
  padding-inline: 10px;
  color: hsl(var(--qp-text-secondary));
  cursor: pointer;
  background: hsl(var(--qp-surface-inset));
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: var(--qp-radius-md);
  transition:
    color var(--qp-motion-instant) var(--qp-motion-ease-out),
    border-color var(--qp-motion-instant) var(--qp-motion-ease-out);
}

.palette-trigger:hover {
  color: hsl(var(--qp-text-primary));
  border-color: hsl(var(--qp-border-active));
}

kbd {
  padding: 1px 5px;
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 10px;
  color: hsl(var(--qp-text-muted));
  background: hsl(var(--qp-surface-raised));
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: 4px;
  box-shadow: var(--qp-shadow-low);
}

.palette-search {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid hsl(var(--qp-border-subtle));
}

.palette-empty {
  padding-block: 72px;
}

:deep(.palette-results .ant-listy-item) {
  padding: 0;
}

.palette-result {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto 16px;
  gap: 10px;
  align-items: center;
  width: 100%;
  min-height: 58px;
  padding: 8px 14px;
  text-align: start;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-bottom: 1px solid hsl(var(--qp-border-subtle));
  transition: background-color var(--qp-motion-instant)
    var(--qp-motion-ease-out);
}

.palette-result:hover,
.palette-result:focus-visible,
.palette-result.active {
  outline: 0;
  background: hsl(var(--qp-surface-raised));
}

.palette-result-icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: hsl(var(--qp-accent-command));
  background: hsl(var(--qp-accent-command) / 12%);
  border-radius: var(--qp-radius-md);
}

.palette-result-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.palette-result-copy strong,
.palette-result-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.palette-result-copy strong {
  font-size: 13px;
  font-weight: 650;
  color: hsl(var(--qp-text-primary));
}

.palette-result-copy small {
  margin-top: 2px;
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 10px;
  color: hsl(var(--qp-text-muted));
}

.palette-arrow {
  color: hsl(var(--qp-text-muted));
}

.palette-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 14px;
  font-size: 10px;
  color: hsl(var(--qp-text-muted));
  border-top: 1px solid hsl(var(--qp-border-subtle));
}

.palette-footer span:last-child {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

:global(.command-palette .ant-modal-content) {
  padding: 0;
  overflow: hidden;
  background: hsl(var(--qp-surface-overlay) / 90%);
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: var(--qp-radius-lg);
  box-shadow: var(--qp-shadow-medium);
  backdrop-filter: blur(18px);
}
</style>
