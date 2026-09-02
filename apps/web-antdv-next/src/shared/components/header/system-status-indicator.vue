<script lang="ts" setup>
import type { OperationalDegradeReason } from '@vben/types';

import type { SystemIndicator } from '#/shared/composables/ws/ws-indicators';
import type { EnumTone } from '#/shared/presentation/enum-presentation';

import { computed } from 'vue';

import { Popover } from 'antdv-next';

import { $t } from '#/locales';
import EnumTag from '#/shared/components/enum-tag.vue';
import {
  formatDateTimeLocal,
  formatDurationSecs,
} from '#/shared/components/format';
import HeaderStatusGlyph from '#/shared/components/header/header-status-glyph.vue';
import StatusChip from '#/shared/components/status-chip.vue';
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

const indicator = computed<SystemIndicator>(() => {
  // First paint before REST/WS seeds the store: show "starting", not the
  // fault-looking "unknown" (问号) tag operators confuse with a stuck state.
  if (!status.value) {
    return 'starting';
  }
  return deriveSystemIndicator(status.value);
});

const INDICATOR_TONE: Record<SystemIndicator, EnumTone> = {
  critical: 'danger',
  degraded: 'warning',
  running: 'success',
  starting: 'running',
  unknown: 'neutral',
};

const INDICATOR_ICON: Record<SystemIndicator, string> = {
  critical: 'lucide:circle-x',
  degraded: 'lucide:triangle-alert',
  running: 'lucide:circle-check',
  starting: 'lucide:loader-circle',
  unknown: 'lucide:circle-help',
};

const phase = computed(() => status.value?.operational_phase.phase ?? null);

const startingDetail = computed(() => {
  if (indicator.value !== 'starting') {
    return null;
  }
  if (!status.value) {
    return $t('page.system.indicator.syncing');
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

const entryAuthorizationPolicy = computed(
  () => status.value?.entry_authorization_policy ?? null,
);
const killSwitch = computed(() => status.value?.kill_switch ?? null);

const marketDataReady = computed(
  () => status.value?.market_data.ready ?? false,
);
const catalogLabel = computed(() => {
  const catalog = status.value?.catalog;
  if (!catalog) return '—';
  return catalog.state === 'ready'
    ? $t('page.system.catalog.ready', { markets: catalog.markets })
    : $t('page.system.catalog.warming');
});

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
  if (!params) {
    return $t(`page.system.degradeReason.${key}`);
  }
  // Wire enums (e.g. kill-switch state) must be localized before interpolation.
  const localized = { ...params };
  if (params.state) {
    localized.state = $t(`enum.killSwitchState.${params.state}`);
  }
  return $t(`page.system.degradeReason.${key}`, localized);
}
</script>

<template>
  <Popover v-if="visible" placement="bottomRight" trigger="click">
    <button
      :aria-label="label"
      class="qp-header-status-btn focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
      type="button"
    >
      <HeaderStatusGlyph
        :icon="INDICATOR_ICON[indicator]"
        :spin="indicator === 'starting'"
        :tone="INDICATOR_TONE[indicator]"
      />
    </button>
    <template #content>
      <div
        class="flex max-h-[70vh] w-80 flex-col gap-3 overflow-y-auto text-sm"
      >
        <div class="grid grid-cols-2 gap-x-3 gap-y-2">
          <span class="text-muted-foreground">
            {{ $t('page.system.field.entryAuthorizationPolicy') }}
          </span>
          <div class="flex justify-end">
            <EnumTag
              context="header-system"
              name="EntryAuthorizationPolicy"
              :value="entryAuthorizationPolicy"
            />
          </div>
          <span class="text-muted-foreground text-xs col-span-2">
            {{ $t('page.system.readonlyHint') }}
          </span>
          <span class="text-muted-foreground">
            {{ $t('page.system.field.killSwitch') }}
          </span>
          <div class="flex justify-end">
            <EnumTag
              context="header-system"
              name="KillSwitchState"
              :value="killSwitch?.state"
            />
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
            <StatusChip
              :tone="status?.catalog?.state === 'ready' ? 'success' : 'running'"
            >
              {{ catalogLabel }}
            </StatusChip>
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
</template>
