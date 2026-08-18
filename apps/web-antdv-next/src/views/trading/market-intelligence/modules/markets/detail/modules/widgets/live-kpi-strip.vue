<script lang="ts" setup>
import { computed } from 'vue';

import { $t } from '#/locales';
import KpiCard from '#/shared/components/kpi-card.vue';

/** Live KPI projection from the freshest book frame (see `metrics.ts`). */
interface LiveMetrics {
  depthUsd: number;
  imbalance: null | number;
  noMid: null | number;
  spreadBps: null | number;
  sum: null | number;
  yesBestAsk: null | number;
  yesBestBid: null | number;
  yesMid: null | number;
}

defineOptions({ name: 'LiveKpiStrip' });

const props = defineProps<{
  fresh: boolean;
  metrics: LiveMetrics;
}>();

const hasBook = computed(
  () => props.metrics.yesMid !== null || props.metrics.noMid !== null,
);

/** Deviation of YES+NO from parity (1.0) — an arbitrage / consistency signal. */
const arbDeviation = computed(() =>
  props.metrics.sum === null ? null : props.metrics.sum - 1,
);

const arbSign = computed<-1 | 0 | 1 | null>(() => {
  const deviation = arbDeviation.value;
  if (deviation === null) {
    return null;
  }
  if (Math.abs(deviation) < 0.005) {
    return 0;
  }
  return deviation > 0 ? 1 : -1;
});

const imbalanceSign = computed<-1 | 0 | 1 | null>(() => {
  const value = props.metrics.imbalance;
  if (value === null) {
    return null;
  }
  if (Math.abs(value) < 0.02) {
    return 0;
  }
  return value > 0 ? 1 : -1;
});

const imbalancePct = computed(() =>
  props.metrics.imbalance === null ? null : props.metrics.imbalance * 100,
);

const bestBidAsk = computed(() => {
  const { yesBestAsk, yesBestBid } = props.metrics;
  if (yesBestBid === null || yesBestAsk === null) {
    return null;
  }
  return `${yesBestBid.toFixed(3)} / ${yesBestAsk.toFixed(3)}`;
});
</script>

<template>
  <div class="kpi-strip" data-testid="live-kpi-strip">
    <KpiCard
      accent="emerald"
      :decimals="4"
      :end-val="metrics.yesMid"
      icon="lucide:trending-up"
      :title="$t('page.markets.detail.kpi.yesMid')"
    />
    <KpiCard
      accent="violet"
      :decimals="4"
      :end-val="metrics.noMid"
      icon="lucide:trending-down"
      :title="$t('page.markets.detail.kpi.noMid')"
    />
    <KpiCard
      accent="sky"
      :decimals="4"
      :end-val="metrics.sum"
      icon="lucide:scale"
      :sign="arbSign"
      :title="$t('page.markets.detail.kpi.sum')"
      :tooltip="$t('page.markets.detail.kpi.sumHint')"
    >
      <template v-if="arbDeviation !== null" #footer>
        {{ $t('page.markets.detail.kpi.deviation') }}:
        {{ (arbDeviation * 100).toFixed(2) }}%
      </template>
    </KpiCard>
    <KpiCard
      accent="amber"
      :decimals="1"
      :end-val="metrics.spreadBps"
      icon="lucide:move-horizontal"
      suffix=" bps"
      :title="$t('page.markets.detail.kpi.spread')"
    >
      <template v-if="bestBidAsk" #footer>
        {{ $t('page.markets.detail.bidPrice') }} /
        {{ $t('page.markets.detail.askPrice') }}: {{ bestBidAsk }}
      </template>
    </KpiCard>
    <KpiCard
      accent="sky"
      :decimals="0"
      :end-val="hasBook ? metrics.depthUsd : null"
      icon="lucide:layers"
      prefix="$"
      :title="$t('page.markets.detail.kpi.depth')"
    />
    <KpiCard
      accent="emerald"
      :decimals="1"
      :end-val="imbalancePct"
      icon="lucide:git-compare"
      :sign="imbalanceSign"
      suffix="%"
      :title="$t('page.markets.detail.kpi.imbalance')"
      :tooltip="$t('page.markets.detail.kpi.imbalanceHint')"
    />
  </div>
</template>

<style scoped>
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.kpi-strip > :deep(*) {
  min-width: 0;
}

@container (min-width: 40rem) {
  .kpi-strip {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@container (min-width: 72rem) {
  .kpi-strip {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}
</style>
