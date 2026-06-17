<script lang="ts" setup>
import type { OperationalDegradeReason } from '@vben/types';

import type { SystemIndicator } from '#/shared/composables/ws/ws-indicators';

import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { useRequestHandler } from '@vben/request/oxide';

import { Button, Popover, Tag } from 'antdv-next';

import { getCircuitBreaker } from '#/api/risk';
import { $t } from '#/locales';
import BreakerBadge from '#/shared/components/breaker-badge.vue';
import BreakerLevelTag from '#/shared/components/breaker-level-tag.vue';
import CatalogStateTag from '#/shared/components/catalog-state-tag.vue';
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
import { useTradesPageTab } from '#/shared/composables/use-trades-page-tab';
import {
  degradeReasonKey,
  degradeReasonParams,
} from '#/shared/composables/ws/degrade-reason';
import {
  deriveSystemIndicator,
  marketDataShardConnected,
} from '#/shared/composables/ws/ws-indicators';
import { useRiskStore, useSystemStore } from '#/store';

defineOptions({ name: 'SystemStatusIndicator' });

const router = useRouter();
const { openTradesTab } = useTradesPageTab();
const systemStore = useSystemStore();
const riskStore = useRiskStore();
const { handleRequest } = useRequestHandler();
const { hasAccessByCodes } = useOxideAccess();
const { emergencyAck, halt, resume } = useSystemControl();
const { uptimeSecs } = useLiveUptime();

const canReadSystem = computed(() => hasAccessByCodes(['system:read']));
const canReadRisk = computed(() => hasAccessByCodes(['risk:read']));
const visible = computed(() => canReadSystem.value);

onMounted(async () => {
  if (!canReadRisk.value) {
    return;
  }
  await handleRequest(getCircuitBreaker, (view) =>
    riskStore.applyBreaker(view),
  );
});

const status = computed(() => systemStore.status);
const breaker = computed(() => riskStore.breaker);

const indicator = computed<SystemIndicator>(() =>
  deriveSystemIndicator(status.value),
);

const INDICATOR_COLOR: Record<SystemIndicator, string> = {
  critical: 'error',
  degraded: 'warning',
  running: 'success',
  starting: 'processing',
  unknown: 'default',
};

const phase = computed(() => status.value?.operational_phase.phase ?? null);

const startingDetail = computed(() => {
  if (!status.value || indicator.value !== 'starting') {
    return null;
  }
  if (phase.value === 'catalog_warming') {
    return $t('page.system.phase.catalog_warming');
  }
  if (phase.value === 'market_data_connecting') {
    const connected = marketDataShardConnected(status.value.market_data);
    const total = status.value.market_data.ws_shards.total;
    return $t('page.system.marketData.connecting', { connected, total });
  }
  return null;
});

const label = computed(() => {
  if (startingDetail.value) {
    return startingDetail.value;
  }
  return $t(`page.system.indicator.${indicator.value}`);
});

const tagColor = computed(() => INDICATOR_COLOR[indicator.value]);

const marketDataReady = computed(
  () => status.value?.market_data.ready ?? false,
);

const lastMessageAgeMs = computed(
  () => status.value?.market_data.last_message_age_ms ?? null,
);

const degradedReasons = computed(() => {
  const operationalPhase = status.value?.operational_phase;
  if (operationalPhase?.phase !== 'degraded') {
    return [] as OperationalDegradeReason[];
  }
  return operationalPhase.reasons;
});

const executionEmergency = computed(
  () => status.value?.execution_emergency ?? null,
);

const showEmergencyAck = computed(
  () =>
    executionEmergency.value?.active &&
    executionEmergency.value.requires_operator_ack,
);

const breakerReason = computed(
  () =>
    breaker.value?.halt_reason ?? breaker.value?.last_emergency_reason ?? null,
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

const integrityCounts = computed(() => ({
  blocking: systemStore.balance?.blocking_trade_count ?? 0,
  needsReconcile: systemStore.balance?.needs_reconcile_count ?? 0,
}));

function degradeReasonLabel(reason: OperationalDegradeReason): string {
  const key = degradeReasonKey(reason);
  const params = degradeReasonParams(reason);
  return params
    ? $t(`page.system.degradeReason.${key}`, params)
    : $t(`page.system.degradeReason.${key}`);
}

function goReconciliation() {
  openTradesTab('reconciliation');
}

function goRisk() {
  router.push('/risk');
}
</script>

<template>
  <div v-if="visible" class="flex h-8 items-center px-2">
    <Popover placement="bottomRight" trigger="click">
      <Tag :color="tagColor" class="cursor-pointer">{{ label }}</Tag>
      <template #content>
        <div
          class="flex max-h-[70vh] w-80 flex-col gap-3 overflow-y-auto text-sm"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-muted-foreground">
              {{ $t('page.system.field.mode') }}
            </span>
            <ExecutionModeTag :mode="status?.execution_mode" />
          </div>

          <div class="grid grid-cols-2 gap-x-3 gap-y-2">
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
              {{ $t('page.system.field.phase') }}
            </span>
            <span class="text-right font-medium">
              {{ phase ? $t(`page.system.phase.${phase}`) : '—' }}
            </span>
            <span class="text-muted-foreground">
              {{ $t('page.system.field.catalog') }}
            </span>
            <div class="flex justify-end">
              <CatalogStateTag :catalog="status?.catalog" />
            </div>
            <span class="text-muted-foreground">
              {{ $t('page.system.field.marketData') }}
            </span>
            <span class="text-right font-medium">
              {{
                marketDataReady
                  ? $t('page.system.marketData.ready')
                  : $t('page.system.marketData.stale')
              }}
            </span>
            <span class="text-muted-foreground">
              {{ $t('page.dashboard.integrity.blockingTrades') }}
            </span>
            <button
              class="text-right font-medium tabular-nums hover:underline"
              type="button"
              @click="goReconciliation"
            >
              {{ integrityCounts.blocking }}
            </button>
            <span class="text-muted-foreground">
              {{ $t('page.dashboard.integrity.needsReconcile') }}
            </span>
            <button
              class="text-right font-medium tabular-nums hover:underline"
              type="button"
              @click="goReconciliation"
            >
              {{ integrityCounts.needsReconcile }}
            </button>
            <span class="text-muted-foreground">
              {{ $t('page.system.field.checkedAt') }}
            </span>
            <span class="text-muted-foreground text-right text-xs tabular-nums">
              {{ formatDateTimeLocal(status?.checked_at) }}
            </span>
          </div>

          <div
            v-if="lastMessageAgeMs !== null"
            class="text-muted-foreground text-xs"
          >
            {{
              $t('page.system.marketData.lastMessageAge', {
                ms: lastMessageAgeMs,
              })
            }}
          </div>

          <div
            v-if="degradedReasons.length > 0"
            class="flex flex-col gap-1 border-t pt-2"
          >
            <span class="text-muted-foreground text-xs font-medium">
              {{ $t('page.system.field.degradeReasons') }}
            </span>
            <ul class="text-destructive list-inside list-disc text-xs">
              <li v-for="(reason, index) in degradedReasons" :key="index">
                {{ degradeReasonLabel(reason) }}
              </li>
            </ul>
          </div>

          <div v-if="canReadRisk" class="flex flex-col gap-2 border-t pt-2">
            <div class="flex items-center justify-between gap-2">
              <span class="text-muted-foreground text-xs font-medium">
                {{ $t('page.dashboard.breakerCard.title') }}
              </span>
              <a class="cursor-pointer text-xs" @click="goRisk">
                {{ $t('page.dashboard.breakerCard.toRisk') }}
              </a>
            </div>
            <div class="flex items-center justify-between gap-2">
              <BreakerBadge
                :state="breaker?.breaker_state ?? status?.breaker_state"
              />
              <BreakerLevelTag :level="breaker?.breaker_level" />
            </div>
            <p
              v-if="breakerReason"
              class="text-destructive text-xs font-medium"
            >
              {{ breakerReason }}
            </p>
            <p v-else class="text-muted-foreground text-xs">
              {{ $t('page.dashboard.breakerCard.nominal') }}
            </p>
          </div>

          <div
            v-if="showEmergencyAck"
            class="flex flex-col gap-1 rounded border border-red-200 bg-red-50 p-2 dark:border-red-900 dark:bg-red-950/40"
          >
            <span class="text-destructive text-xs font-medium">
              {{
                $t('page.system.emergencyAck.classLabel', {
                  class: $t(
                    `enum.executionEmergencyClass.${executionEmergency?.class}`,
                  ),
                })
              }}
            </span>
            <span v-if="executionEmergency?.last_reason" class="text-xs">
              {{ executionEmergency.last_reason }}
            </span>
            <Button
              v-access:code="'system:resume'"
              block
              danger
              size="small"
              type="primary"
              @click="emergencyAck"
            >
              {{ $t('page.integrity.actions.emergencyAck') }}
            </Button>
          </div>

          <div class="flex justify-end gap-2 border-t pt-2">
            <Button
              v-access:code="'system:halt'"
              danger
              size="small"
              @click="halt"
            >
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
      </template>
    </Popover>
  </div>
</template>
