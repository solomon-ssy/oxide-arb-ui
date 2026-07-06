<script lang="ts" setup>
import type { NegRiskEventDriftView } from '@vben/types';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Button, Card, Empty, Table, Tag } from 'antdv-next';

import { listNegRiskEvents } from '#/api/vertical-alpha';
import { formatDateTimeLocal } from '#/shared/components/format';

defineOptions({ name: 'StructuralMonitorPage' });

const { handleRequest } = useRequestHandler();

const events = ref<NegRiskEventDriftView[]>([]);
const loading = ref(false);

const legColumns = [
  { dataIndex: 'question', title: 'Leg' },
  { dataIndex: 'best_ask', title: 'Best ask' },
];

/** Drift beyond ±5 cents on the leg-sum is a notable structural mispricing. */
const DRIFT_ALERT = 0.05;

function driftColor(drift: null | string): string {
  if (drift === null) {
    return 'default';
  }
  return Math.abs(Number(drift)) >= DRIFT_ALERT ? 'error' : 'success';
}

async function refresh() {
  loading.value = true;
  try {
    const result = await handleRequest(() => listNegRiskEvents());
    events.value = result ?? [];
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);
</script>

<template>
  <Page auto-content-height>
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-base font-medium">Neg-risk leg-sum drift</h2>
      <Button :loading="loading" size="small" @click="refresh">Refresh</Button>
    </div>

    <Empty v-if="events.length === 0" description="No active neg-risk events" />

    <div v-else class="flex flex-col gap-4">
      <Card v-for="event in events" :key="event.event_id" size="small">
        <template #title>
          <div class="flex items-center gap-2">
            <span>{{ event.title }}</span>
            <Tag :color="driftColor(event.drift)">
              Σ ask {{ event.ask_sum ?? '—' }}
              <template v-if="event.drift !== null">
                (drift {{ event.drift }})
              </template>
            </Tag>
            <span class="text-muted-foreground text-xs">
              {{ event.leg_count }} legs ·
              {{ formatDateTimeLocal(event.as_of) }}
            </span>
          </div>
        </template>
        <Table
          :columns="legColumns"
          :data-source="event.legs"
          :pagination="false"
          row-key="yes_token_id"
          size="small"
        />
      </Card>
    </div>
  </Page>
</template>
