<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';

import WorkspaceShell from '#/shared/components/workspace/workspace-shell.vue';

defineOptions({ name: 'ExecutionPostTradeWorkspace' });

const Reconciliation = defineAsyncComponent(
  () => import('./modules/reconciliation/index.vue'),
);
const Settlement = defineAsyncComponent(
  () => import('./modules/settlement/index.vue'),
);

const modules = [
  {
    component: Reconciliation,
    icon: 'lucide:git-compare-arrows',
    key: 'reconciliation',
    label: 'page.commandPalette.module.reconciliation',
  },
  {
    component: Settlement,
    icon: 'lucide:badge-dollar-sign',
    key: 'settlement',
    label: 'page.commandPalette.module.settlement',
  },
  {
    component: Settlement,
    icon: 'lucide:shield-check',
    key: 'actions',
    label: 'page.commandPalette.module.actions',
  },
];
</script>

<template>
  <WorkspaceShell
    description="page.workspace.executionPostTrade.description"
    domain="execution"
    eyebrow="page.workspace.executionPostTrade.eyebrow"
    :modules="modules"
    title="page.menu.executionPostTrade"
  />
</template>
