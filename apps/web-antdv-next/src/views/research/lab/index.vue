<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';

import WorkspaceShell from '#/shared/components/workspace/workspace-shell.vue';

defineOptions({ name: 'ResearchLabWorkspace' });

const Specs = defineAsyncComponent(() => import('./modules/specs/index.vue'));
const Lineage = defineAsyncComponent(
  () => import('./modules/lineage/index.vue'),
);
const Datasets = defineAsyncComponent(
  () => import('./modules/datasets/index.vue'),
);
const Factors = defineAsyncComponent(
  () => import('./modules/factors/index.vue'),
);
const Models = defineAsyncComponent(() => import('./modules/models/index.vue'));
const Evaluation = defineAsyncComponent(
  () => import('./modules/evaluation/index.vue'),
);

const modules = [
  {
    component: Lineage,
    icon: 'lucide:workflow',
    key: 'lineage',
    label: 'page.commandPalette.module.lineage',
  },
  {
    component: Specs,
    icon: 'lucide:braces',
    key: 'specs',
    label: 'page.commandPalette.module.specs',
  },
  {
    component: Datasets,
    icon: 'lucide:database',
    key: 'datasets',
    label: 'page.commandPalette.module.datasets',
  },
  {
    component: Factors,
    icon: 'lucide:sigma',
    key: 'factors',
    label: 'page.commandPalette.module.factors',
  },
  {
    component: Models,
    icon: 'lucide:brain-circuit',
    key: 'models',
    label: 'page.commandPalette.module.models',
  },
  {
    component: Evaluation,
    icon: 'lucide:chart-no-axes-combined',
    key: 'evaluation',
    label: 'page.commandPalette.module.evaluation',
  },
];
</script>

<template>
  <WorkspaceShell
    description="page.workspace.researchLab.description"
    domain="research"
    eyebrow="page.workspace.researchLab.eyebrow"
    :modules="modules"
    title="page.menu.researchLab"
  />
</template>
