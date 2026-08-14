<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';

import WorkspaceShell from '#/shared/components/workspace/workspace-shell.vue';

defineOptions({ name: 'LearningPolicyWorkspace' });

const Policies = defineAsyncComponent(
  () => import('./modules/policy-workspace.vue'),
);
const Fits = defineAsyncComponent(() => import('./modules/fits/workbench.vue'));
const Feedback = defineAsyncComponent(
  () => import('./modules/feedback/index.vue'),
);
const Calibration = defineAsyncComponent(
  () => import('./modules/calibration/index.vue'),
);

const modules = [
  {
    component: Policies,
    icon: 'lucide:route',
    key: 'policies',
    label: 'page.commandPalette.module.policies',
  },
  {
    component: Fits,
    icon: 'lucide:wand-sparkles',
    key: 'fits',
    label: 'page.commandPalette.module.fits',
  },
  {
    component: Feedback,
    icon: 'lucide:refresh-ccw-dot',
    key: 'feedback',
    label: 'page.commandPalette.module.feedback',
  },
  {
    component: Calibration,
    icon: 'lucide:sliders-horizontal',
    key: 'calibration',
    label: 'page.commandPalette.module.calibration',
  },
];
</script>

<template>
  <WorkspaceShell
    description="page.workspace.learningPolicy.description"
    domain="research"
    eyebrow="page.workspace.learningPolicy.eyebrow"
    :modules="modules"
    title="page.menu.researchLearningPolicy"
  />
</template>
