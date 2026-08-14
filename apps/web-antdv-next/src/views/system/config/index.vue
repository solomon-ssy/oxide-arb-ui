<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';

import WorkspaceShell from '#/shared/components/workspace/workspace-shell.vue';

defineOptions({ name: 'SystemConfigWorkspace' });

const Overview = defineAsyncComponent(
  () => import('./modules/governance/index.vue'),
);
const Deployment = defineAsyncComponent(
  () => import('./modules/governance/deployment.vue'),
);
const Activity = defineAsyncComponent(
  () => import('./modules/governance/activity.vue'),
);
const Policy = defineAsyncComponent(
  () => import('./modules/governance/policy-workspace.vue'),
);

const modules = [
  {
    component: Overview,
    icon: 'lucide:toggle-right',
    key: 'runtime',
    label: 'page.commandPalette.module.runtime',
  },
  {
    component: Deployment,
    icon: 'lucide:server-cog',
    key: 'deploy',
    label: 'page.commandPalette.module.deploy',
  },
  {
    component: Policy,
    icon: 'lucide:file-cog',
    key: 'policy',
    label: 'page.commandPalette.module.policy',
  },
  {
    component: Activity,
    icon: 'lucide:history',
    key: 'history',
    label: 'page.commandPalette.module.history',
  },
];
</script>

<template>
  <WorkspaceShell
    description="page.workspace.systemConfig.description"
    domain="governance"
    eyebrow="page.workspace.systemConfig.eyebrow"
    :modules="modules"
    title="page.menu.systemConfig"
  />
</template>
