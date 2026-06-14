<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { useRequestHandler } from '@vben/request/oxide';

import { Button } from 'antdv-next';

import { getCircuitBreaker } from '#/api/risk';
import { getSystemStatus } from '#/api/system';
import { $t } from '#/locales';
import BreakerBadge from '#/shared/components/breaker-badge.vue';
import BreakerLevelTag from '#/shared/components/breaker-level-tag.vue';
import CatalogStateTag from '#/shared/components/catalog-state-tag.vue';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import ExecutionModeTag from '#/shared/components/execution-mode-tag.vue';
import {
  decimalSign,
  formatDateTimeLocal,
  formatDurationSecs,
  formatUsd,
  parseDecimal,
} from '#/shared/components/format';
import { useLiveUptime } from '#/shared/composables/use-live-uptime';
import { useOxideAccess } from '#/shared/composables/use-oxide-access';
import { useSystemControl } from '#/shared/composables/use-system-control';
import { useRiskStore, useSystemStore } from '#/store';

defineOptions({ name: 'DashboardSystemStatusCard' });

const router = useRouter();
const systemStore = useSystemStore();
const riskStore = useRiskStore();
const { handleRequest } = useRequestHandler();
const { halt, resume } = useSystemControl();
const { uptimeSecs } = useLiveUptime();
const { hasAccessByCodes } = useOxideAccess();

const canReadSystem = computed(() => hasAccessByCodes(['system:read']));
const canReadRisk = computed(() => hasAccessByCodes(['risk:read']));

onMounted(async () => {
  const tasks: Promise<void>[] = [];
  if (canReadSystem.value) {
    tasks.push(
      handleRequest(getSystemStatus, (status) =>
        systemStore.applySystemStatus(status),
      ).then(() => undefined),
    );
  }
  if (canReadRisk.value) {
    tasks.push(
      handleRequest(getCircuitBreaker, (view) =>
        riskStore.applyBreaker(view),
      ).then(() => undefined),
    );
  }
  await Promise.all(tasks);
});

const status = computed(() => systemStore.status);
const breaker = computed(() => riskStore.breaker);

const breakerReason = computed(
  () => breaker.value?.halt_reason ?? riskStore.lastTrip?.reason ?? null,
);

const dailyPnlSign = computed(() => decimalSign(status.value?.daily_pnl));

const dailyPnlClass = computed(() => {
  const sign = dailyPnlSign.value;
  if (sign === 1) {
    return 'text-emerald-600 dark:text-emerald-400';
  }
  if (sign === -1) {
    return 'text-rose-600 dark:text-rose-400';
  }
  return 'text-muted-foreground';
});

const exposureClass = computed(() => {
  const exposure = parseDecimal(status.value?.total_exposure);
  if (exposure === null) {
    return '';
  }
  if (exposure.lte(0)) {
    return 'text-muted-foreground';
  }
  return 'text-amber-600 dark:text-amber-400';
});

function goRisk() {
  router.push('/risk');
}
</script>

<template>
  <DashboardPanel
    fill
    icon="lucide:server"
    tone="sky"
    :title="$t('page.dashboard.systemCard.title')"
  >
    <template v-if="canReadRisk" #extra>
      <a class="cursor-pointer text-xs" @click="goRisk">
        {{ $t('page.dashboard.breakerCard.toRisk') }}
      </a>
    </template>

    <div class="flex flex-col gap-4">
      <div v-if="canReadSystem" class="flex justify-end">
        <ExecutionModeTag :mode="status?.execution_mode" />
      </div>

      <div
        v-if="canReadSystem"
        class="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm"
      >
        <span class="text-muted-foreground">
          {{ $t('page.system.field.uptime') }}
        </span>
        <span class="text-right font-medium tabular-nums">
          {{ formatDurationSecs(uptimeSecs) }}
        </span>
        <span class="text-muted-foreground">
          {{ $t('page.system.field.activeMarkets') }}
        </span>
        <span class="text-right font-medium tabular-nums">
          {{ status?.active_markets ?? '—' }}
        </span>
        <span class="text-muted-foreground">
          {{ $t('page.system.field.openPositions') }}
        </span>
        <span class="text-right font-medium tabular-nums">
          {{ status?.open_positions ?? '—' }}
        </span>
        <span class="text-muted-foreground">
          {{ $t('page.system.field.exposure') }}
        </span>
        <span
          :class="exposureClass"
          class="text-right font-medium tabular-nums"
        >
          {{ formatUsd(status?.total_exposure) }}
        </span>
        <span class="text-muted-foreground">
          {{ $t('page.system.field.dailyPnl') }}
        </span>
        <span
          :class="dailyPnlClass"
          class="text-right font-medium tabular-nums"
        >
          {{ formatUsd(status?.daily_pnl) }}
        </span>
        <span class="text-muted-foreground">
          {{ $t('page.system.field.catalog') }}
        </span>
        <div class="flex justify-end">
          <CatalogStateTag :catalog="status?.catalog" />
        </div>
        <span class="text-muted-foreground">
          {{ $t('page.system.field.checkedAt') }}
        </span>
        <span class="text-muted-foreground text-right text-xs tabular-nums">
          {{ formatDateTimeLocal(status?.checked_at) }}
        </span>
      </div>

      <div
        v-if="canReadRisk"
        class="border-border flex flex-col gap-2.5 border-t pt-3"
      >
        <span class="text-muted-foreground text-xs font-medium">
          {{ $t('page.dashboard.breakerCard.title') }}
        </span>
        <div class="flex items-center justify-between gap-2">
          <BreakerBadge
            :state="breaker?.breaker_state ?? status?.breaker_state"
          />
          <BreakerLevelTag :level="breaker?.breaker_level" />
        </div>
        <p v-if="breakerReason" class="text-destructive text-sm font-medium">
          {{ breakerReason }}
        </p>
        <p v-else class="text-muted-foreground text-sm">
          {{ $t('page.dashboard.breakerCard.nominal') }}
        </p>
      </div>

      <div
        v-if="canReadSystem"
        class="border-border mt-auto flex justify-end gap-2 border-t pt-3"
      >
        <Button v-access:code="'system:halt'" danger size="small" @click="halt">
          {{ $t('page.system.halt.action') }}
        </Button>
        <Button
          v-access:code="'system:resume'"
          size="small"
          type="primary"
          @click="resume"
        >
          {{ $t('page.system.resume.action') }}
        </Button>
      </div>
    </div>
  </DashboardPanel>
</template>
