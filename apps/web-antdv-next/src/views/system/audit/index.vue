<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';

import WorkspaceShell from '#/shared/components/workspace/workspace-shell.vue';

defineOptions({ name: 'SystemAuditWorkspace' });

const Operations = defineAsyncComponent(
  () => import('./modules/operation-log/index.vue'),
);

const modules = [
  {
    component: Operations,
    icon: 'lucide:scroll-text',
    key: 'operations',
    label: 'page.commandPalette.module.operations',
  },
  {
    component: Operations,
    icon: 'lucide:receipt-text',
    key: 'receipts',
    label: 'page.commandPalette.module.receipts',
  },
  {
    component: Operations,
    icon: 'lucide:history',
    key: 'entity-timeline',
    label: 'page.commandPalette.module.entity-timeline',
  },
];
</script>

<template>
  <WorkspaceShell
    description="page.workspace.systemAudit.description"
    domain="governance"
    eyebrow="page.workspace.systemAudit.eyebrow"
    :modules="modules"
    title="page.menu.systemAudit"
  />
</template>
