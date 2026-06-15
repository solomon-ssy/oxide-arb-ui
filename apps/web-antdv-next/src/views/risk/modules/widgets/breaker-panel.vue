<script lang="ts" setup>
import type { BreakerStateName, RiskEngineStateView } from '@vben/types';

import { computed } from 'vue';

import { BREAKER_STATES } from '@vben/types';

import { Button, Skeleton } from 'antdv-next';

import { $t } from '#/locales';
import BreakerBadge from '#/shared/components/breaker-badge.vue';
import BreakerLevelTag from '#/shared/components/breaker-level-tag.vue';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import { formatDateTimeLocal } from '#/shared/components/format';

defineOptions({ name: 'RiskBreakerPanel' });

const props = withDefaults(
  defineProps<{
    breaker: null | RiskEngineStateView;
    canReset?: boolean;
    loading?: boolean;
  }>(),
  { canReset: false, loading: false },
);

const emit = defineEmits<{
  reset: [];
}>();

const states: BreakerStateName[] = [
  BREAKER_STATES.closed,
  BREAKER_STATES.open,
  BREAKER_STATES.halfOpen,
  BREAKER_STATES.recovered,
  BREAKER_STATES.halted,
];

const reason = computed(
  () =>
    props.breaker?.halt_reason ?? props.breaker?.last_emergency_reason ?? '—',
);

const snapshotAt = computed(() =>
  props.breaker?.snapshot_at
    ? formatDateTimeLocal(props.breaker.snapshot_at)
    : '—',
);

const resetDisabled = computed(
  () => !props.breaker || props.breaker.breaker_state === BREAKER_STATES.closed,
);
</script>

<template>
  <DashboardPanel
    fill
    icon="lucide:shield-alert"
    tone="amber"
    :title="$t('page.risk.breaker.title')"
  >
    <template #extra>
      <Button
        v-access:code="'risk:reset'"
        danger
        size="small"
        :disabled="resetDisabled || !canReset"
        @click="emit('reset')"
      >
        {{ $t('page.risk.breaker.reset') }}
      </Button>
    </template>

    <Skeleton v-if="loading && !breaker" active />
    <div v-else class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-2">
        <BreakerBadge :state="breaker?.breaker_state" />
        <BreakerLevelTag :level="breaker?.breaker_level" />
      </div>

      <div class="grid grid-cols-5 gap-2">
        <div
          v-for="state in states"
          :key="state"
          class="rounded border px-2 py-2 text-center text-xs"
          :class="
            breaker?.breaker_state === state
              ? 'border-primary text-primary bg-primary/10 font-semibold'
              : 'text-muted-foreground'
          "
        >
          {{ $t(`enum.breakerState.${state}`) }}
        </div>
      </div>

      <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <span class="text-muted-foreground">
          {{ $t('page.risk.breaker.reason') }}
        </span>
        <span class="truncate" :title="reason">{{ reason }}</span>
        <span class="text-muted-foreground">
          {{ $t('page.risk.breaker.cooldownUntil') }}
        </span>
        <span>
          {{
            breaker?.cooldown_until
              ? formatDateTimeLocal(breaker.cooldown_until)
              : '—'
          }}
        </span>
        <span class="text-muted-foreground">
          {{ $t('page.risk.breaker.snapshotAt') }}
        </span>
        <span>{{ snapshotAt }}</span>
      </div>
    </div>
  </DashboardPanel>
</template>
