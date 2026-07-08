<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';

import { useRequestHandler } from '@vben/request/qp';
import { EXECUTION_ORDER_STATES } from '@vben/types';

import { Card, Skeleton, Spin, Statistic } from 'antdv-next';

import { listExecutionOrders } from '#/api/execution-orders';
import { listOrderIntents } from '#/api/order-intents';
import { listReconciliations } from '#/api/reconciliations';
import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import { useDashboardStatusRefreshKey } from '#/shared/composables/use-dashboard-status-refresh-key';
import { useOrderIntentStore, useReconciliationStore } from '#/store';

defineOptions({ name: 'ExecutionPipelineCard' });

const props = defineProps<{
  canReadExecutionOrders: boolean;
  canReadIntents: boolean;
  canReadReconciliations: boolean;
}>();

const emit = defineEmits<{
  navigateExecutionOrders: [];
  navigateIntents: [];
  navigateReconciliations: [];
}>();

const orderIntentStore = useOrderIntentStore();
const reconciliationStore = useReconciliationStore();
const { handleRequest } = useRequestHandler();
const { pipelineRefreshKey } = useDashboardStatusRefreshKey();

const pendingIntents = ref<null | number>(null);
const inFlightOrders = ref<null | number>(null);
const unresolvedReconciliations = ref<null | number>(null);
const loading = ref(false);

async function loadPendingIntents() {
  if (!props.canReadIntents) {
    return;
  }
  const page = await handleRequest(
    () => listOrderIntents({ size: 1, status: 'pending_approval' }),
    { silent: true },
  );
  pendingIntents.value = page?.total ?? null;
}

async function countInFlightOrders() {
  if (!props.canReadExecutionOrders) {
    return;
  }
  const states = [
    EXECUTION_ORDER_STATES.submitted,
    EXECUTION_ORDER_STATES.partiallyFilled,
    EXECUTION_ORDER_STATES.ambiguous,
  ] as const;
  const pages = await Promise.all(
    states.map((state) =>
      handleRequest(() => listExecutionOrders({ size: 1, state }), {
        silent: true,
      }),
    ),
  );
  inFlightOrders.value = pages.reduce(
    (total, page) => total + (page?.total ?? 0),
    0,
  );
}

async function loadUnresolvedReconciliations() {
  if (!props.canReadReconciliations) {
    return;
  }
  const page = await handleRequest(
    () => listReconciliations({ resolved: false, size: 1 }),
    { silent: true },
  );
  unresolvedReconciliations.value = page?.total ?? null;
}

async function loadAll() {
  loading.value = true;
  await Promise.all([
    loadPendingIntents(),
    countInFlightOrders(),
    loadUnresolvedReconciliations(),
  ]);
  loading.value = false;
}

// Intent lifecycle drives both pending approvals and in-flight submissions.
watch(
  () => orderIntentStore.revision,
  () => {
    void loadPendingIntents();
    void countInFlightOrders();
  },
);
watch(() => reconciliationStore.revision, loadUnresolvedReconciliations);
// No execution-order WS channel exists; `system.status` is the refresh signal
// for phase / auto-execution changes that move in-flight work.
watch(pipelineRefreshKey, () => void loadAll());

onMounted(() => {
  void loadAll();
});
</script>

<template>
  <DashboardPanel
    :title="$t('page.dashboard.pipeline.title')"
    icon="lucide:workflow"
    tone="amber"
    fill
  >
    <Spin :spinning="loading">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card
          v-if="canReadIntents"
          hoverable
          size="small"
          @click="emit('navigateIntents')"
        >
          <Skeleton
            v-if="loading && pendingIntents === null"
            :paragraph="false"
            :title="{ width: '40%' }"
            active
          />
          <Statistic
            v-else
            :title="$t('page.dashboard.pipeline.pendingIntents')"
            :value="pendingIntents ?? '—'"
          />
        </Card>
        <Card
          v-if="canReadExecutionOrders"
          hoverable
          size="small"
          @click="emit('navigateExecutionOrders')"
        >
          <Skeleton
            v-if="loading && inFlightOrders === null"
            :paragraph="false"
            :title="{ width: '40%' }"
            active
          />
          <Statistic
            v-else
            :title="$t('page.dashboard.pipeline.inFlightOrders')"
            :value="inFlightOrders ?? '—'"
          />
        </Card>
        <Card
          v-if="canReadReconciliations"
          hoverable
          size="small"
          @click="emit('navigateReconciliations')"
        >
          <Skeleton
            v-if="loading && unresolvedReconciliations === null"
            :paragraph="false"
            :title="{ width: '40%' }"
            active
          />
          <Statistic
            v-else
            :title="$t('page.dashboard.pipeline.unresolvedReconciliations')"
            :value="unresolvedReconciliations ?? '—'"
          />
        </Card>
      </div>
    </Spin>
  </DashboardPanel>
</template>
