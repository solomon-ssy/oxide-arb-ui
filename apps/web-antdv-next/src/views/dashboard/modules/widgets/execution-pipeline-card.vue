<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';

import { useRequestHandler } from '@vben/request/qp';
import { EXECUTION_ORDER_STATES } from '@vben/types';

import { listExecutionOrders } from '#/api/execution-orders';
import { listOrderIntents } from '#/api/order-intents';
import { listReconciliations } from '#/api/reconciliations';
import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import { useOrderIntentStore } from '#/store';

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
const { handleRequest } = useRequestHandler();

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
  let total = 0;
  for (const state of states) {
    const page = await handleRequest(
      () => listExecutionOrders({ size: 1, state }),
      { silent: true },
    );
    total += page?.total ?? 0;
  }
  inFlightOrders.value = total;
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

watch(() => orderIntentStore.revision, loadPendingIntents);

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
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <button
        v-if="canReadIntents"
        class="hover:bg-accent flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors"
        type="button"
        @click="emit('navigateIntents')"
      >
        <span class="font-mono text-3xl font-semibold tabular-nums">
          {{ pendingIntents ?? '—' }}
        </span>
        <span class="text-muted-foreground text-xs">
          {{ $t('page.dashboard.pipeline.pendingIntents') }}
        </span>
      </button>
      <button
        v-if="canReadExecutionOrders"
        class="hover:bg-accent flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors"
        type="button"
        @click="emit('navigateExecutionOrders')"
      >
        <span class="font-mono text-3xl font-semibold tabular-nums">
          {{ inFlightOrders ?? '—' }}
        </span>
        <span class="text-muted-foreground text-xs">
          {{ $t('page.dashboard.pipeline.inFlightOrders') }}
        </span>
      </button>
      <button
        v-if="canReadReconciliations"
        class="hover:bg-accent flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors"
        type="button"
        @click="emit('navigateReconciliations')"
      >
        <span class="font-mono text-3xl font-semibold tabular-nums">
          {{ unresolvedReconciliations ?? '—' }}
        </span>
        <span class="text-muted-foreground text-xs">
          {{ $t('page.dashboard.pipeline.unresolvedReconciliations') }}
        </span>
      </button>
    </div>
    <div v-if="loading" class="text-muted-foreground mt-2 text-center text-xs">
      {{ $t('page.dashboard.pipeline.loading') }}
    </div>
  </DashboardPanel>
</template>
