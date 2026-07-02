<script lang="ts" setup>
import type { OperationalDegradeReason } from '@vben/types';

import type { SystemIndicator } from '#/shared/composables/ws/ws-indicators';

import { computed } from 'vue';

import { Popover, Tag } from 'antdv-next';

import { $t } from '#/locales';
import CatalogStateTag from '#/shared/components/catalog-state-tag.vue';
import {
  formatDateTimeLocal,
  formatDurationSecs,
} from '#/shared/components/format';
import { useLiveUptime } from '#/shared/composables/use-live-uptime';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import {
  degradeReasonKey,
  degradeReasonParams,
} from '#/shared/composables/ws/degrade-reason';
import {
  deriveSystemIndicator,
  marketDataShardConnected,
} from '#/shared/composables/ws/ws-indicators';
import { useSystemStore } from '#/store';

defineOptions({ name: 'SystemStatusIndicator' });

const systemStore = useSystemStore();
const { hasAccessByCodes } = useQpAccess();
const { uptimeSecs } = useLiveUptime();

const visible = computed(() => hasAccessByCodes(['system:read']));
const status = computed(() => systemStore.status);

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

const KILL_SWITCH_COLOR: Record<string, string> = {
  closed: 'success',
  emergency_halted: 'magenta',
  execution_halted: 'error',
  exit_only: 'warning',
  report_only_forced: 'gold',
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

const label = computed(
  () => startingDetail.value ?? $t(`page.system.indicator.${indicator.value}`),
);

const tagColor = computed(() => INDICATOR_COLOR[indicator.value]);

const runtimeMode = computed(() => status.value?.quant_runtime_mode ?? null);
const killSwitch = computed(() => status.value?.kill_switch ?? null);

const marketDataReady = computed(
  () => status.value?.market_data.ready ?? false,
);

const degradedReasons = computed(() => {
  const operationalPhase = status.value?.operational_phase;
  if (operationalPhase?.phase !== 'degraded') {
    return [] as OperationalDegradeReason[];
  }
  return operationalPhase.reasons;
});

function degradeReasonLabel(reason: OperationalDegradeReason): string {
  const key = degradeReasonKey(reason);
  const params = degradeReasonParams(reason);
  return params
    ? $t(`page.system.degradeReason.${key}`, params)
    : $t(`page.system.degradeReason.${key}`);
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
          <div class="grid grid-cols-2 gap-x-3 gap-y-2">
            <span class="text-muted-foreground">
              {{ $t('page.system.field.mode') }}
            </span>
            <div class="flex justify-end">
              <Tag color="processing">
                {{
                  runtimeMode ? $t(`enum.quantRuntimeMode.${runtimeMode}`) : '—'
                }}
              </Tag>
            </div>
            <span class="text-muted-foreground">
              {{ $t('page.system.field.killSwitch') }}
            </span>
            <div class="flex justify-end">
              <Tag
                :color="KILL_SWITCH_COLOR[killSwitch?.state ?? ''] ?? 'default'"
              >
                {{
                  killSwitch
                    ? $t(`enum.killSwitchState.${killSwitch.state}`)
                    : '—'
                }}
              </Tag>
            </div>
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
              {{ $t('page.system.field.checkedAt') }}
            </span>
            <span class="text-muted-foreground text-right text-xs tabular-nums">
              {{ formatDateTimeLocal(status?.checked_at) }}
            </span>
          </div>

          <div
            v-if="killSwitch?.requires_operator_ack"
            class="text-destructive text-xs font-medium"
          >
            {{ $t('page.system.killSwitch.requiresAck') }}
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
        </div>
      </template>
    </Popover>
  </div>
</template>
