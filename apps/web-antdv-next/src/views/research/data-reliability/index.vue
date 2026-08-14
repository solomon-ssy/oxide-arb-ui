<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';

import WorkspaceShell from '#/shared/components/workspace/workspace-shell.vue';

defineOptions({ name: 'DataReliabilityWorkspace' });

const Sources = defineAsyncComponent(
  () => import('./modules/sources/index.vue'),
);
const Linkages = defineAsyncComponent(
  () => import('./modules/linkages/index.vue'),
);
const Alerts = defineAsyncComponent(() => import('./modules/basis/index.vue'));
const Integrity = defineAsyncComponent(
  () => import('./modules/integrity/index.vue'),
);

const modules = [
  {
    component: Sources,
    icon: 'lucide:database-zap',
    key: 'sources',
    label: 'page.commandPalette.module.sources',
  },
  {
    component: Linkages,
    icon: 'lucide:link-2',
    key: 'linkages',
    label: 'page.commandPalette.module.linkages',
  },
  {
    component: Alerts,
    icon: 'lucide:triangle-alert',
    key: 'basis-alerts',
    label: 'page.commandPalette.module.basis-alerts',
  },
  {
    component: Integrity,
    icon: 'lucide:shield-check',
    key: 'feature-integrity',
    label: 'page.commandPalette.module.feature-integrity',
  },
];
</script>

<template>
  <WorkspaceShell
    description="page.workspace.dataReliability.description"
    eyebrow="page.workspace.dataReliability.eyebrow"
    :modules="modules"
    title="page.menu.researchDataReliability"
  />
</template>
