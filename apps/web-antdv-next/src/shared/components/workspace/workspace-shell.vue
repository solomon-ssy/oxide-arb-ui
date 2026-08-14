<script lang="ts" setup>
import type { WorkspaceModule } from './workspace-shell.types';

import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import { Alert, Flex, TabPane, Tabs } from 'antdv-next';
import { motion, useReducedMotion } from 'motion-v';

import { $t } from '#/locales';

defineOptions({ name: 'WorkspaceShell' });

const props = defineProps<{
  description: string;
  eyebrow: string;
  modules: WorkspaceModule[];
  title: string;
}>();

const route = useRoute();
const router = useRouter();
const reducedMotion = useReducedMotion();

const fallbackModule = computed(() => props.modules[0]);
const moduleKeys = computed(
  () => new Set(props.modules.map((item) => item.key)),
);
const activeKey = computed({
  get() {
    const raw = Array.isArray(route.query.module)
      ? route.query.module[0]
      : route.query.module;
    return typeof raw === 'string' && moduleKeys.value.has(raw)
      ? raw
      : fallbackModule.value?.key;
  },
  set(value: string | undefined) {
    if (!value || !moduleKeys.value.has(value)) return;
    const { entity: _entity, id: _id, ...query } = route.query;
    void router.push({ query: { ...query, module: value } });
  },
});
const activeModule = computed(() =>
  props.modules.find((item) => item.key === activeKey.value),
);

function canonicalizeModule() {
  const raw = Array.isArray(route.query.module)
    ? route.query.module[0]
    : route.query.module;
  const fallback = fallbackModule.value?.key;
  if (!fallback || raw === fallback || moduleKeys.value.has(String(raw))) {
    return;
  }
  void router.replace({
    query: { ...route.query, module: fallback },
  });
}

watch(() => route.query.module, canonicalizeModule);
onMounted(canonicalizeModule);
</script>

<template>
  <Flex
    class="workspace-shell"
    :data-ui-ready="activeModule ? 'true' : 'false'"
    data-testid="workspace-shell"
    gap="middle"
    vertical
  >
    <header class="workspace-hero">
      <p class="workspace-eyebrow">{{ $t(eyebrow) }}</p>
      <h1>{{ $t(title) }}</h1>
      <p>{{ $t(description) }}</p>
    </header>

    <Tabs v-model:active-key="activeKey" class="workspace-tabs">
      <TabPane v-for="item in modules" :key="item.key">
        <template #tab>
          <span class="workspace-tab">
            <IconifyIcon :icon="item.icon" />
            {{ $t(item.label) }}
          </span>
        </template>
      </TabPane>
    </Tabs>

    <Alert
      v-if="!activeModule"
      :message="$t('page.workspace.invalidModule')"
      show-icon
      type="error"
    />
    <motion.div
      v-else
      :key="activeModule.key"
      :animate="reducedMotion ? undefined : { opacity: 1, y: 0 }"
      :initial="reducedMotion ? false : { opacity: 0, y: 8 }"
      :transition="{ duration: reducedMotion ? 0 : 0.2 }"
    >
      <component :is="activeModule.component" />
    </motion.div>
  </Flex>
</template>

<style scoped>
.workspace-shell {
  max-width: 1600px;
  padding: 16px 16px 28px;
  margin-inline: auto;
}

.workspace-hero {
  position: relative;
  padding: var(--qp-density-card-padding);
  overflow: hidden;
  background: var(--qp-gradient-surface), hsl(var(--qp-surface-raised));
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: var(--qp-radius-lg);
}

.workspace-hero::after {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: 3px;
  content: '';
  background: var(--qp-gradient-brand);
}

.workspace-eyebrow {
  font-size: 11px;
  font-weight: 750;
  color: hsl(var(--qp-accent-realtime));
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.workspace-hero h1 {
  margin-top: 4px;
  font-size: clamp(20px, 2vw, 28px);
  font-weight: 720;
  letter-spacing: -0.025em;
}

.workspace-hero > p:last-child {
  max-width: 840px;
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.65;
  color: hsl(var(--qp-text-secondary));
}

.workspace-tabs {
  margin-bottom: -16px;
}

.workspace-tab {
  display: inline-flex;
  gap: 7px;
  align-items: center;
}

@media (max-width: 640px) {
  .workspace-shell {
    padding-inline: 8px;
  }

  .workspace-tab svg {
    display: none;
  }
}
</style>
