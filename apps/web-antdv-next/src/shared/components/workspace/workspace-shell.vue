<script lang="ts" setup>
import type { WorkspaceDomain, WorkspaceModule } from './workspace-shell.types';

import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Alert, Flex } from 'antdv-next';
import { AnimatePresence, motion, useReducedMotion } from 'motion-v';

import { $t } from '#/locales';

import WorkspaceInspectorHost from './workspace-inspector-host.vue';
import { inspectorModule } from './workspace-inspector-registry';
import {
  highlightedTab,
  isLandingModule,
  resolveWorkspaceModule,
} from './workspace-landing';
import WorkspaceTabs from './workspace-tabs.vue';

defineOptions({ name: 'WorkspaceShell' });

const props = defineProps<{
  description: string;
  domain: WorkspaceDomain;
  eyebrow: string;
  modules: WorkspaceModule[];
  title: string;
}>();

const route = useRoute();
const router = useRouter();
const reducedMotion = useReducedMotion();

const landingModules = computed(() =>
  props.modules.filter((item) => isLandingModule(item)),
);
const fallbackModule = computed(() => landingModules.value[0]);
const moduleKeys = computed(
  () => new Set(props.modules.map((item) => item.key)),
);
const activeKey = computed(() => {
  const raw = Array.isArray(route.query.module)
    ? route.query.module[0]
    : route.query.module;
  return typeof raw === 'string' && moduleKeys.value.has(raw)
    ? raw
    : fallbackModule.value?.key;
});
const tabKey = computed({
  get() {
    return highlightedTab(props.modules, activeKey.value);
  },
  set(value: string | undefined) {
    if (!value || !landingModules.value.some((item) => item.key === value)) {
      return;
    }
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
  const entity = Array.isArray(route.query.entity)
    ? route.query.entity[0]
    : route.query.entity;
  const id = Array.isArray(route.query.id) ? route.query.id[0] : route.query.id;
  const next = resolveWorkspaceModule({
    entity: typeof entity === 'string' ? entity : undefined,
    id: typeof id === 'string' ? id : undefined,
    modules: props.modules,
    path: route.path,
    requested: typeof raw === 'string' ? raw : undefined,
  });
  if (!next || next === raw) return;
  void router.replace({
    query: {
      ...route.query,
      module: next,
    },
  });
}

function canonicalizeInspector() {
  const entity = Array.isArray(route.query.entity)
    ? route.query.entity[0]
    : route.query.entity;
  const id = Array.isArray(route.query.id) ? route.query.id[0] : route.query.id;
  if (entity === undefined && id === undefined) return;

  const requestedModuleValue = Array.isArray(route.query.module)
    ? route.query.module[0]
    : route.query.module;
  const requestedModule =
    typeof requestedModuleValue === 'string' ? requestedModuleValue : undefined;
  const module =
    typeof entity === 'string' && typeof id === 'string' && id.length > 0
      ? inspectorModule(route.path, entity, requestedModule)
      : undefined;
  if (!module) {
    const { entity: _entity, id: _id, ...query } = route.query;
    void router.replace({ query });
    return;
  }
  if (requestedModule !== module) {
    void router.replace({ query: { ...route.query, module } });
  }
}

watch(
  () => [route.query.module, route.query.entity, route.query.id],
  canonicalizeModule,
);
watch(() => [route.query.entity, route.query.id], canonicalizeInspector);
onMounted(() => {
  canonicalizeModule();
  canonicalizeInspector();
});
</script>

<template>
  <Flex
    class="workspace-shell"
    :data-domain="domain"
    :data-ui-ready="activeModule ? 'true' : 'false'"
    data-testid="workspace-shell"
    gap="middle"
    vertical
  >
    <header class="workspace-hero qp-page-hero">
      <p class="workspace-eyebrow">{{ $t(eyebrow) }}</p>
      <h1 tabindex="-1">{{ $t(title) }}</h1>
      <p>{{ $t(description) }}</p>
    </header>

    <WorkspaceTabs
      v-model="tabKey"
      :label="$t(title)"
      :modules="landingModules"
    >
      <WorkspaceInspectorHost>
        <Alert
          v-if="!activeModule"
          :message="$t('page.workspace.invalidModule')"
          show-icon
          type="error"
        />
        <AnimatePresence v-else :initial="false" mode="wait">
          <motion.div
            :key="activeModule.key"
            :animate="reducedMotion ? undefined : { y: 0 }"
            :exit="reducedMotion ? undefined : { y: -4 }"
            :initial="reducedMotion ? false : { y: 8 }"
            :transition="{ duration: reducedMotion ? 0 : 0.18 }"
          >
            <component :is="activeModule.component" />
          </motion.div>
        </AnimatePresence>
      </WorkspaceInspectorHost>
    </WorkspaceTabs>
  </Flex>
</template>

<style scoped>
.workspace-shell {
  --workspace-accent: var(--qp-accent-sky);
  --workspace-aurora-medium: 7%;
  --workspace-aurora-soft: 6%;
  --workspace-aurora-strong: 8%;
  --workspace-gradient: var(--qp-gradient-trading);
  --workspace-control: var(--qp-gradient-control);
  --qp-gradient-hairline: linear-gradient(
    90deg,
    hsl(var(--qp-accent-sky)),
    hsl(var(--qp-accent-violet)) 64%,
    hsl(var(--qp-accent-pink))
  );
  --workspace-hero:
    radial-gradient(
      circle at 8% 0%,
      hsl(var(--qp-accent-sky) / var(--workspace-aurora-strong)),
      transparent 34%
    ),
    radial-gradient(
      circle at 58% -22%,
      hsl(var(--qp-accent-violet) / var(--workspace-aurora-medium)),
      transparent 40%
    ),
    radial-gradient(
      circle at 96% 10%,
      hsl(var(--qp-accent-pink) / var(--workspace-aurora-soft)),
      transparent 42%
    );
  --qp-shadow-inspector: var(--qp-glow-sky);
  --qp-shadow-workspace: var(--qp-glow-sky);

  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  max-width: 1600px;
  min-height: calc(100dvh - var(--vben-header-height, 48px));
  padding: 16px 16px 28px;
  margin-inline: auto;
}

.workspace-shell[data-domain='execution'] {
  --workspace-accent: var(--qp-accent-orange);
  --workspace-gradient: var(--qp-gradient-execution);
  --qp-gradient-hairline: linear-gradient(
    90deg,
    hsl(var(--qp-accent-violet)),
    hsl(var(--qp-accent-pink)) 58%,
    hsl(var(--qp-accent-orange))
  );
  --workspace-control: linear-gradient(
    180deg,
    hsl(var(--qp-accent-violet)),
    hsl(var(--qp-accent-pink)) 58%,
    hsl(var(--qp-accent-orange))
  );
  --workspace-hero:
    radial-gradient(
      circle at 8% 0%,
      hsl(var(--qp-accent-violet) / var(--workspace-aurora-strong)),
      transparent 34%
    ),
    radial-gradient(
      circle at 58% -22%,
      hsl(var(--qp-accent-pink) / var(--workspace-aurora-medium)),
      transparent 40%
    ),
    radial-gradient(
      circle at 96% 10%,
      hsl(var(--qp-accent-orange) / var(--workspace-aurora-soft)),
      transparent 42%
    );
  --qp-shadow-inspector: var(--qp-glow-orange);
  --qp-shadow-workspace: var(--qp-glow-orange);
}

.workspace-shell[data-domain='research'] {
  --workspace-accent: var(--qp-accent-pink);
  --workspace-gradient: var(--qp-gradient-research);
  --qp-gradient-hairline: linear-gradient(
    90deg,
    hsl(var(--qp-accent-violet)),
    hsl(var(--qp-accent-pink))
  );
  --workspace-control: linear-gradient(
    180deg,
    hsl(var(--qp-accent-violet)),
    hsl(var(--qp-accent-pink))
  );
  --workspace-hero:
    radial-gradient(
      circle at 8% 0%,
      hsl(var(--qp-accent-violet) / var(--workspace-aurora-strong)),
      transparent 34%
    ),
    radial-gradient(
      circle at 70% -22%,
      hsl(var(--qp-accent-pink) / var(--workspace-aurora-medium)),
      transparent 42%
    ),
    radial-gradient(
      circle at 100% 100%,
      hsl(var(--qp-accent-violet) / var(--workspace-aurora-soft)),
      transparent 38%
    );
  --qp-shadow-inspector: var(--qp-glow-pink);
  --qp-shadow-workspace: var(--qp-glow-pink);
}

.workspace-shell[data-domain='governance'] {
  --workspace-accent: var(--qp-accent-violet);
  --workspace-gradient: var(--qp-gradient-governance);
  --qp-gradient-hairline: linear-gradient(
    90deg,
    hsl(var(--qp-accent-sky)),
    hsl(var(--qp-accent-violet))
  );
  --workspace-control: linear-gradient(
    180deg,
    hsl(var(--qp-accent-sky)),
    hsl(var(--qp-accent-violet))
  );
  --workspace-hero:
    radial-gradient(
      circle at 8% 0%,
      hsl(var(--qp-accent-sky) / var(--workspace-aurora-strong)),
      transparent 34%
    ),
    radial-gradient(
      circle at 72% -22%,
      hsl(var(--qp-accent-violet) / var(--workspace-aurora-medium)),
      transparent 42%
    ),
    radial-gradient(
      circle at 100% 100%,
      hsl(var(--qp-accent-sky) / var(--workspace-aurora-soft)),
      transparent 38%
    );
  --qp-shadow-inspector: var(--qp-glow-violet);
  --qp-shadow-workspace: var(--qp-glow-violet);
}

.workspace-hero {
  background: var(--workspace-hero), hsl(var(--qp-surface-raised));
}

:global(.dark) .workspace-shell {
  --workspace-aurora-medium: 12%;
  --workspace-aurora-soft: 10%;
  --workspace-aurora-strong: 14%;
}

.workspace-eyebrow {
  font-size: 11px;
  font-weight: 750;
  color: hsl(var(--workspace-accent));
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

.workspace-shell :deep(.ant-btn-primary:not(.ant-btn-dangerous)),
.workspace-shell
  :deep(.ant-btn-color-primary.ant-btn-variant-solid:not(.ant-btn-dangerous)) {
  color: white;
  background: var(--workspace-control);
  background-clip: border-box;
  background-origin: border-box;
  border-color: transparent;
  box-shadow: var(--qp-shadow-subtle);
}

.workspace-shell :deep(.ant-btn:focus-visible) {
  outline: 2px solid hsl(var(--workspace-accent));
  outline-offset: 2px;
  box-shadow: var(--qp-shadow-focus);
}

@media (max-width: 640px) {
  .workspace-shell {
    padding-inline: 8px;
  }
}
</style>
