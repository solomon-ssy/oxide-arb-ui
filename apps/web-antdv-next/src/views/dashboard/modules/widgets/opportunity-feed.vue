<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Empty } from 'antdv-next';

import { $t } from '#/locales';
import { DASHBOARD_SURFACE } from '#/shared/components/dashboard-accent';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import {
  formatBps,
  formatDateTimeLocal,
  formatUsd,
  truncateHexId,
} from '#/shared/components/format';
import { useOpportunityStore } from '#/store';

defineOptions({ name: 'DashboardOpportunityFeed' });

const surface = DASHBOARD_SURFACE;

const FEED_LIMIT = 20;
const HIGHLIGHT_MS = 2000;

const router = useRouter();
const opportunityStore = useOpportunityStore();

const entries = computed(() => opportunityStore.feed.slice(0, FEED_LIMIT));

const highlighted = ref<Set<string>>(new Set());
const timers: ReturnType<typeof setTimeout>[] = [];

watch(
  () => opportunityStore.feed[0]?.opportunity_id,
  (id) => {
    if (!id) {
      return;
    }
    highlighted.value.add(id);
    timers.push(
      setTimeout(() => {
        highlighted.value.delete(id);
      }, HIGHLIGHT_MS),
    );
  },
);

onBeforeUnmount(() => {
  for (const timer of timers) {
    clearTimeout(timer);
  }
});

function goOpportunities() {
  router.push('/opportunities');
}
</script>

<template>
  <DashboardPanel
    fill
    icon="lucide:zap"
    tone="violet"
    :title="$t('page.dashboard.feed.title')"
  >
    <template #extra>
      <a class="cursor-pointer text-xs" @click="goOpportunities">
        {{ $t('page.dashboard.feed.toOpportunities') }}
      </a>
    </template>
    <div
      v-if="entries.length === 0"
      class="flex flex-1 items-center justify-center py-8"
    >
      <Empty :image="Empty.PRESENTED_IMAGE_SIMPLE" />
    </div>
    <ul v-else class="flex max-h-80 flex-col gap-1 overflow-y-auto pr-1">
      <li
        v-for="entry in entries"
        :key="entry.opportunity_id"
        :class="[
          surface.rowHover,
          highlighted.has(entry.opportunity_id) ? 'bg-accent' : '',
        ]"
        class="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md px-2.5 py-2 text-xs transition-colors duration-500"
      >
        <span class="flex flex-col gap-0.5">
          <span class="font-mono font-medium">
            {{ truncateHexId(entry.market_id) }}
          </span>
          <span class="text-muted-foreground">
            {{ formatDateTimeLocal(entry.detected_at) }}
          </span>
        </span>
        <span class="font-mono tabular-nums">{{
          formatBps(entry.edge_bps)
        }}</span>
        <span class="font-mono tabular-nums">
          {{ formatUsd(entry.expected_net_profit_usd) }}
        </span>
      </li>
    </ul>
  </DashboardPanel>
</template>
