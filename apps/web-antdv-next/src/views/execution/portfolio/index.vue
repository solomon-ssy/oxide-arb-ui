<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';

import WorkspaceShell from '#/shared/components/workspace/workspace-shell.vue';

defineOptions({ name: 'ExecutionPortfolioWorkspace' });

const Account = defineAsyncComponent(
  () => import('./modules/account/index.vue'),
);
const Positions = defineAsyncComponent(
  () => import('./modules/positions/index.vue'),
);

const modules = [
  {
    component: Account,
    icon: 'lucide:landmark',
    key: 'account',
    label: 'page.commandPalette.module.account',
  },
  {
    component: Positions,
    icon: 'lucide:briefcase-business',
    key: 'positions',
    label: 'page.commandPalette.module.positions',
  },
  {
    component: Account,
    icon: 'lucide:gauge',
    key: 'exposure',
    label: 'page.commandPalette.module.exposure',
  },
  {
    component: Account,
    icon: 'lucide:chart-spline',
    key: 'equity',
    label: 'page.commandPalette.module.equity',
  },
];
</script>

<template>
  <WorkspaceShell
    description="page.workspace.executionPortfolio.description"
    domain="execution"
    eyebrow="page.workspace.executionPortfolio.eyebrow"
    :modules="modules"
    title="page.menu.executionPortfolio"
  />
</template>
