<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { useRequestHandler } from '@vben/request/oxide';

import { getCircuitBreaker } from '#/api/risk';
import { $t } from '#/locales';
import BreakerBadge from '#/shared/components/breaker-badge.vue';
import BreakerLevelTag from '#/shared/components/breaker-level-tag.vue';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import { useOxideAccess } from '#/shared/composables/use-oxide-access';
import { useRiskStore } from '#/store';

defineOptions({ name: 'DashboardBreakerHealthCard' });

const router = useRouter();
const riskStore = useRiskStore();
const { handleRequest } = useRequestHandler();
const { hasAccessByCodes } = useOxideAccess();

const canReadRisk = computed(() => hasAccessByCodes(['risk:read']));

onMounted(async () => {
  if (!canReadRisk.value) {
    return;
  }
  await handleRequest(getCircuitBreaker, (view) =>
    riskStore.applyBreaker(view),
  );
});

const breaker = computed(() => riskStore.breaker);

const breakerReason = computed(
  () =>
    breaker.value?.halt_reason ?? breaker.value?.last_emergency_reason ?? null,
);

function goRisk() {
  router.push('/risk');
}
</script>

<template>
  <DashboardPanel
    fill
    icon="lucide:shield-alert"
    tone="amber"
    :title="$t('page.dashboard.breakerCard.title')"
  >
    <template #extra>
      <a class="cursor-pointer text-xs" @click="goRisk">
        {{ $t('page.dashboard.breakerCard.toRisk') }}
      </a>
    </template>

    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between gap-2">
        <BreakerBadge :state="breaker?.breaker_state" />
        <BreakerLevelTag :level="breaker?.breaker_level" />
      </div>
      <p v-if="breakerReason" class="text-destructive text-sm font-medium">
        {{ breakerReason }}
      </p>
      <p v-else class="text-muted-foreground text-sm">
        {{ $t('page.dashboard.breakerCard.nominal') }}
      </p>
      <p class="text-muted-foreground text-xs">
        {{ $t('page.dashboard.breakerCard.hint') }}
      </p>
    </div>
  </DashboardPanel>
</template>
