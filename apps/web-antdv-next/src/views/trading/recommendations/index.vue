<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';

import WorkspaceShell from '#/shared/components/workspace/workspace-shell.vue';

defineOptions({ name: 'RecommendationWorkspace' });

const Reports = defineAsyncComponent(
  () => import('./modules/reports/index.vue'),
);
const Queue = defineAsyncComponent(() => import('./modules/queue/index.vue'));
const Funnel = defineAsyncComponent(() => import('./modules/funnel/index.vue'));
const Diff = defineAsyncComponent(() => import('./modules/diff/index.vue'));

const modules = [
  {
    component: Reports,
    icon: 'lucide:file-chart-column',
    key: 'reports',
    label: 'page.commandPalette.module.reports',
  },
  {
    component: Queue,
    highlight: 'reports',
    icon: 'lucide:list-restart',
    key: 'queue',
    label: 'page.commandPalette.module.queue',
    landing: false,
  },
  {
    component: Funnel,
    highlight: 'reports',
    icon: 'lucide:funnel',
    key: 'funnel',
    label: 'page.commandPalette.module.funnel',
    landing: false,
  },
  {
    component: Diff,
    highlight: 'reports',
    icon: 'lucide:git-compare',
    key: 'diff',
    label: 'page.commandPalette.module.diff',
    landing: false,
  },
];
</script>

<template>
  <WorkspaceShell
    description="page.workspace.recommendations.description"
    domain="trading"
    eyebrow="page.workspace.recommendations.eyebrow"
    :modules="modules"
    title="page.menu.recommendations"
  />
</template>
