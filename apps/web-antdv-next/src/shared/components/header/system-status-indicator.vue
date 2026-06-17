<script lang="ts" setup>
import type { OperationalDegradeReason } from '@vben/types';

import type { SystemIndicator } from '#/shared/composables/ws/ws-indicators';

import { computed } from 'vue';

import { Button, Popover, Tag } from 'antdv-next';

import { $t } from '#/locales';
import BreakerBadge from '#/shared/components/breaker-badge.vue';
import CatalogStateTag from '#/shared/components/catalog-state-tag.vue';
import ExecutionModeTag from '#/shared/components/execution-mode-tag.vue';
import { formatUsd } from '#/shared/components/format';
import { useOxideAccess } from '#/shared/composables/use-oxide-access';
import { useSystemControl } from '#/shared/composables/use-system-control';
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
const { hasAccessByCodes } = useOxideAccess();
const { halt, resume } = useSystemControl();

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

const phase = computed(() => status.value?.operational_phase.phase ?? null);

const startingDetail = computed(() => {
  if (!status.value || indicator.value !== 'starting') {
    return null;
  }
  if (phase.value === 'catalog_warming') {
    return $t('page.system.phase.catalogWarming');
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
  const phase = status.value?.operational_phase;
  if (phase?.phase !== 'degraded') {
    return [] as OperationalDegradeReason[];
  }
  return phase.reasons;
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
        <div class="flex w-72 flex-col gap-3 text-sm">
          <div class="flex items-center justify-between gap-2">
            <span class="text-muted-foreground">
              {{ $t('page.system.field.mode') }}
            </span>
            <ExecutionModeTag :mode="status?.execution_mode" />
          </div>
          <div class="flex items-center justify-between gap-2">
            <span class="text-muted-foreground">
              {{ $t('page.system.field.phase') }}
            </span>
            <span class="font-medium">
              {{ phase ? $t(`page.system.phase.${phase}`) : '—' }}
            </span>
          </div>
          <div class="flex items-center justify-between gap-2">
            <span class="text-muted-foreground">
              {{ $t('page.system.field.catalog') }}
            </span>
            <CatalogStateTag :catalog="status?.catalog" />
          </div>
          <div class="flex items-center justify-between gap-2">
            <span class="text-muted-foreground">
              {{ $t('page.system.field.marketData') }}
            </span>
            <span class="font-medium">
              {{
                marketDataReady
                  ? $t('page.system.marketData.ready')
                  : $t('page.system.marketData.stale')
              }}
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
          <div class="flex items-center justify-between gap-2">
            <span class="text-muted-foreground">
              {{ $t('page.system.field.breaker') }}
            </span>
            <BreakerBadge :state="status?.breaker_state" />
          </div>
          <div class="flex items-center justify-between gap-2">
            <span class="text-muted-foreground">
              {{ $t('page.system.field.exposure') }}
            </span>
            <span class="font-medium tabular-nums">
              {{ formatUsd(status?.total_exposure) }}
            </span>
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
