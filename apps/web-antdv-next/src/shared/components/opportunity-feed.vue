<script lang="ts" setup>
import type { OpportunityView } from '@vben/types';

import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import { Button, Empty } from 'antdv-next';

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

defineOptions({ name: 'OpportunityFeed' });

const props = withDefaults(
  defineProps<{
    /**
     * `compact` — dashboard widget: top 20 entries, "view all" link.
     * `full` — opportunities page: full 200-cap feed, pause/freeze toggle,
     * clickable rows emitting `select`.
     */
    variant?: 'compact' | 'full';
  }>(),
  { variant: 'compact' },
);

const emit = defineEmits<{
  /** Row click (full variant only) — open the audit drawer. */
  select: [entry: OpportunityView];
}>();

const surface = DASHBOARD_SURFACE;

const COMPACT_LIMIT = 20;
const HIGHLIGHT_MS = 2000;

const router = useRouter();
const opportunityStore = useOpportunityStore();

const isFull = computed(() => props.variant === 'full');

/** Pause freezes the rendered list; the store keeps ingesting behind it. */
const paused = ref(false);
const frozen = ref<OpportunityView[]>([]);

function togglePause() {
  paused.value = !paused.value;
  frozen.value = paused.value ? [...opportunityStore.feed] : [];
}

const entries = computed(() => {
  const live = paused.value ? frozen.value : opportunityStore.feed;
  return isFull.value ? live : live.slice(0, COMPACT_LIMIT);
});

/** Count of detections that arrived while the view is frozen. */
const pendingWhilePaused = computed(() => {
  if (!paused.value) {
    return 0;
  }
  const newestFrozen = frozen.value[0]?.opportunity_id;
  const index = opportunityStore.feed.findIndex(
    (o) => o.opportunity_id === newestFrozen,
  );
  return index === -1 ? opportunityStore.feed.length : index;
});

const highlighted = ref<Set<string>>(new Set());
const timers: ReturnType<typeof setTimeout>[] = [];

watch(
  () => opportunityStore.feed[0]?.opportunity_id,
  (id) => {
    if (!id || paused.value) {
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

function onRowClick(entry: OpportunityView) {
  if (isFull.value) {
    emit('select', entry);
  }
}
</script>

<template>
  <DashboardPanel
    fill
    icon="lucide:zap"
    tone="violet"
    :title="
      isFull
        ? $t('page.opportunities.feed.title')
        : $t('page.dashboard.feed.title')
    "
  >
    <template #extra>
      <a v-if="!isFull" class="cursor-pointer text-xs" @click="goOpportunities">
        {{ $t('page.dashboard.feed.toOpportunities') }}
      </a>
      <Button v-else size="small" type="text" @click="togglePause">
        <span class="flex items-center gap-1 text-xs">
          <IconifyIcon :icon="paused ? 'lucide:play' : 'lucide:pause'" />
          {{
            paused
              ? $t('page.opportunities.feed.resume')
              : $t('page.opportunities.feed.pause')
          }}
          <span v-if="pendingWhilePaused > 0" class="text-muted-foreground">
            (+{{ pendingWhilePaused }})
          </span>
        </span>
      </Button>
    </template>
    <div
      v-if="entries.length === 0"
      class="flex flex-1 items-center justify-center py-8"
    >
      <Empty :image="Empty.PRESENTED_IMAGE_SIMPLE" />
    </div>
    <ul
      v-else
      :class="isFull ? 'max-h-full' : 'max-h-80'"
      class="flex flex-col gap-1 overflow-y-auto pr-1"
    >
      <li
        v-for="entry in entries"
        :key="entry.opportunity_id"
        :class="[
          surface.rowHover,
          highlighted.has(entry.opportunity_id) ? 'bg-accent' : '',
          isFull ? 'cursor-pointer' : '',
        ]"
        class="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md px-2.5 py-2 text-xs transition-colors duration-500"
        @click="onRowClick(entry)"
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
