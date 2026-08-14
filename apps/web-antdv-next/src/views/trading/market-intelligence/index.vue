<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';

import WorkspaceShell from '#/shared/components/workspace/workspace-shell.vue';

defineOptions({ name: 'MarketIntelligenceWorkspace' });

const Markets = defineAsyncComponent(
  () => import('./modules/markets/index.vue'),
);
const LiveMarket = defineAsyncComponent(
  () => import('./modules/markets/detail/index.vue'),
);
const MarketStructure = defineAsyncComponent(
  () => import('./modules/structure/index.vue'),
);

const modules = [
  {
    component: Markets,
    icon: 'lucide:radar',
    key: 'overview',
    label: 'page.commandPalette.module.overview',
  },
  {
    component: LiveMarket,
    icon: 'lucide:radio-tower',
    key: 'live',
    label: 'page.commandPalette.module.live',
  },
  {
    component: MarketStructure,
    icon: 'lucide:network',
    key: 'structure',
    label: 'page.commandPalette.module.structure',
  },
];
</script>

<template>
  <WorkspaceShell
    description="page.workspace.marketIntelligence.description"
    domain="trading"
    eyebrow="page.workspace.marketIntelligence.eyebrow"
    :modules="modules"
    title="page.menu.marketIntelligence"
  />
</template>
