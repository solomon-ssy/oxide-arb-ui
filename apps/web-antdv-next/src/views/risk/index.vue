<script lang="ts" setup>
import type { UsdString } from '@vben/types';

import type { PositionGridRow } from './modules/schemas';

import { computed, onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/oxide';

import { message } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getCircuitBreaker,
  getDailyLoss,
  getExposure,
  getPositions,
  resetCircuitBreaker,
} from '#/api/risk';
import { getCurrentRuntimeConfig } from '#/api/runtime-config';
import { $t } from '#/locales';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useOxideAccess } from '#/shared/composables/use-oxide-access';
import { useRiskStore } from '#/store';

import { toPositionGridRows, usePositionColumns } from './modules/schemas';
import BreakerPanel from './modules/widgets/breaker-panel.vue';
import DailyLossGauge from './modules/widgets/daily-loss-gauge.vue';
import ExposureCards from './modules/widgets/exposure-cards.vue';

defineOptions({ name: 'RiskOverviewPage' });

const riskStore = useRiskStore();
const { handleRequest } = useRequestHandler();
const { governed } = useGovernedAction();
const { hasAccessByCodes } = useOxideAccess();

const loading = ref(false);
const exposure = ref<null | UsdString>(null);
const dailyLoss = ref<null | UsdString>(null);
const dailyLossLimit = ref<null | UsdString>(null);

const canResetRisk = computed(() => hasAccessByCodes(['risk:reset']));
const canReadRuntimeConfig = computed(() =>
  hasAccessByCodes(['runtime_config:read']),
);

const positions = computed(() => riskStore.positions);
const breaker = computed(() => riskStore.breaker);
const gaugeDailyLoss = computed(
  () => dailyLoss.value ?? breaker.value?.daily_loss_usd ?? null,
);

/** Upper dashboard cards (breaker / gauge / exposure). Positions are grid-owned. */
async function refreshPageMetrics() {
  loading.value = true;
  try {
    await Promise.all([
      handleRequest(getCircuitBreaker, (view) => riskStore.applyBreaker(view)),
      handleRequest(getExposure, (value) => {
        exposure.value = value;
      }),
      handleRequest(getDailyLoss, (value) => {
        dailyLoss.value = value;
      }),
      canReadRuntimeConfig.value
        ? handleRequest(getCurrentRuntimeConfig, (view) => {
            dailyLossLimit.value = view.config.risk?.max_daily_loss_usd ?? null;
          })
        : Promise.resolve(null),
    ]);
  } finally {
    loading.value = false;
  }
}

const [Grid, gridApi] = useVbenVxeGrid<PositionGridRow>({
  gridOptions: {
    columns: usePositionColumns(),
    rowConfig: { keyField: 'position_id' },
    toolbarConfig: { refresh: { code: 'query' } },
    proxyConfig: {
      ajax: {
        query: async () => {
          let items: Awaited<ReturnType<typeof getPositions>> = [];
          await handleRequest(getPositions, {
            onSuccess: (rows) => {
              items = rows;
              riskStore.positions = rows;
            },
            silent: true,
          });
          const gridRows = toPositionGridRows(items);
          return {
            has_next: false,
            items: gridRows,
            page: 1,
            size: gridRows.length,
            total: gridRows.length,
          };
        },
      },
    },
  },
});

async function onResetBreaker() {
  const result = await governed(
    (ctx) => resetCircuitBreaker({ reason: ctx.reason }, ctx),
    {
      confirmWord: 'RESET',
      danger: true,
      summary: $t('page.risk.breaker.resetSummary'),
      title: $t('page.risk.breaker.reset'),
    },
  );
  if (result !== null) {
    message.success($t('page.risk.breaker.resetSubmitted'));
  }
}

onMounted(() => {
  void refreshPageMetrics();
});

watch(
  positions,
  (items) => {
    gridApi.setGridOptions({ data: toPositionGridRows(items) });
  },
  { deep: true },
);
</script>

<template>
  <Page auto-content-height>
    <div class="flex flex-col gap-4">
      <div class="grid gap-4 xl:grid-cols-2">
        <BreakerPanel
          :breaker="breaker"
          :can-reset="canResetRisk"
          :loading="loading"
          @reset="onResetBreaker"
        />
        <DailyLossGauge
          :daily-loss="gaugeDailyLoss"
          :limit="dailyLossLimit"
          :loading="loading"
        />
      </div>

      <ExposureCards
        :breaker="breaker"
        :exposure="exposure"
        :loading="loading"
        :positions-count="positions.length"
      />

      <Grid :table-title="$t('page.risk.positions.title')" />
    </div>
  </Page>
</template>
