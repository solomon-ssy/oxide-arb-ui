<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';

import WorkspaceShell from '#/shared/components/workspace/workspace-shell.vue';

defineOptions({ name: 'ExecutionOrdersWorkspace' });

const Intents = defineAsyncComponent(
  () => import('./modules/intents/index.vue'),
);
const Orders = defineAsyncComponent(() => import('./modules/orders/index.vue'));
const Flow = defineAsyncComponent(() => import('./modules/flow/index.vue'));

const modules = [
  {
    component: Intents,
    icon: 'lucide:file-input',
    key: 'intents',
    label: 'page.commandPalette.module.intents',
  },
  {
    component: Intents,
    icon: 'lucide:badge-check',
    key: 'approvals',
    label: 'page.commandPalette.module.approvals',
  },
  {
    component: Orders,
    icon: 'lucide:route',
    key: 'orders',
    label: 'page.commandPalette.module.orders',
  },
  {
    component: Flow,
    icon: 'lucide:git-branch',
    key: 'flow',
    label: 'page.commandPalette.module.flow',
  },
];
</script>

<template>
  <WorkspaceShell
    description="page.workspace.executionOrders.description"
    eyebrow="page.workspace.executionOrders.eyebrow"
    :modules="modules"
    title="page.menu.executionOrders"
  />
</template>
