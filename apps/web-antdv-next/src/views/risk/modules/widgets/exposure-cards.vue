<script lang="ts" setup>
import type { RiskEngineStateView, UsdString } from '@vben/types';

import { computed } from 'vue';

import { $t } from '#/locales';
import { decimalSign, formatUsd } from '#/shared/components/format';
import StatCard from '#/shared/components/stat-card.vue';

defineOptions({ name: 'RiskExposureCards' });

const props = withDefaults(
  defineProps<{
    breaker: null | RiskEngineStateView;
    exposure?: null | UsdString;
    loading?: boolean;
    positionsCount: number;
  }>(),
  { exposure: null, loading: false },
);

const exposureValue = computed(
  () => props.exposure ?? props.breaker?.total_exposure,
);

const dailyBudgetSpent = computed(() => props.breaker?.daily_budget_spent);
</script>

<template>
  <div class="grid gap-4 md:grid-cols-3">
    <StatCard
      :loading="loading"
      :sign="decimalSign(exposureValue)"
      :title="$t('page.risk.exposure.total')"
      :tooltip="$t('page.risk.exposure.totalTooltip')"
      :value="formatUsd(exposureValue)"
    />
    <StatCard
      :loading="loading"
      :title="$t('page.risk.exposure.positions')"
      :value="String(positionsCount)"
    />
    <StatCard
      :loading="loading"
      :sign="decimalSign(dailyBudgetSpent)"
      :title="$t('page.risk.exposure.dailyBudgetSpent')"
      :tooltip="$t('page.risk.exposure.dailyBudgetSpentTooltip')"
      :value="formatUsd(dailyBudgetSpent)"
    />
  </div>
</template>
