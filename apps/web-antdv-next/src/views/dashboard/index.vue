<script lang="ts" setup>
import { computed } from 'vue';

import { Page } from '@vben/common-ui';

import { useOxideAccess } from '#/shared/composables/use-oxide-access';

import KpiCards from './modules/widgets/kpi-cards.vue';
import OpportunityFeed from './modules/widgets/opportunity-feed.vue';
import PnlCurve from './modules/widgets/pnl-curve.vue';
import QuickLinks from './modules/widgets/quick-links.vue';
import RecentTrades from './modules/widgets/recent-trades.vue';
import ReplayRunsCard from './modules/widgets/replay-runs-card.vue';
import SystemStatusCard from './modules/widgets/system-status-card.vue';

defineOptions({ name: 'DashboardOverview' });

const { hasAccessByCodes } = useOxideAccess();

const canReadPnl = computed(() => hasAccessByCodes(['pnl:read']));
const canReadSystem = computed(() => hasAccessByCodes(['system:read']));
const canReadRisk = computed(() => hasAccessByCodes(['risk:read']));
const canReadOpportunity = computed(() =>
  hasAccessByCodes(['opportunity:read']),
);
const canReadTrade = computed(() => hasAccessByCodes(['trade:read']));
const canReadReplay = computed(() => hasAccessByCodes(['control_factor:read']));

const showKpi = computed(
  () => canReadPnl.value || canReadSystem.value || canReadRisk.value,
);
</script>

<template>
  <Page auto-content-height>
    <div class="flex flex-col gap-5 pb-4">
      <KpiCards v-if="showKpi" />

      <div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div v-if="canReadPnl" class="xl:col-span-2">
          <PnlCurve />
        </div>
        <SystemStatusCard
          v-if="canReadSystem || canReadRisk"
          :class="canReadPnl ? '' : 'xl:col-span-3'"
        />
      </div>

      <div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ReplayRunsCard v-if="canReadReplay" />
        <div
          v-if="canReadOpportunity"
          :class="canReadReplay ? 'xl:col-span-2' : 'xl:col-span-3'"
        >
          <OpportunityFeed />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div v-if="canReadTrade" class="xl:col-span-2">
          <RecentTrades />
        </div>
        <QuickLinks :class="canReadTrade ? '' : 'xl:col-span-3'" />
      </div>
    </div>
  </Page>
</template>
