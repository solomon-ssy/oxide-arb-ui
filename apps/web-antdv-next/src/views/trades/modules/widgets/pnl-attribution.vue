<script lang="ts" setup>
import type { TradeView } from '@vben/types';

import { computed } from 'vue';

import { $t } from '#/locales';
import { decimalSign, formatUsd } from '#/shared/components/format';

defineOptions({ name: 'PnlAttribution' });

const props = defineProps<{ trade: TradeView }>();

interface AttributionRow {
  label: string;
  value: string;
  signClass: string;
  hint?: string;
}

function signClass(value: null | string): string {
  const sign = decimalSign(value);
  if (sign === null || sign === 0) {
    return '';
  }
  return sign > 0 ? 'text-success' : 'text-destructive';
}

const rows = computed<AttributionRow[]>(() => [
  {
    label: $t('page.trades.pnl.cost'),
    signClass: '',
    value: formatUsd(props.trade.cost_usd),
  },
  {
    label: $t('page.trades.pnl.fee'),
    signClass: '',
    value: formatUsd(props.trade.fee_usd),
  },
  {
    label: $t('page.trades.pnl.detectedProfit'),
    signClass: signClass(props.trade.detected_profit_usd),
    value: formatUsd(props.trade.detected_profit_usd),
  },
  {
    label: $t('page.trades.pnl.netProfit'),
    signClass: signClass(props.trade.net_profit_usd),
    value: formatUsd(props.trade.net_profit_usd),
    hint:
      props.trade.net_profit_kind === 'fill_ev'
        ? $t('page.trades.pnl.netProfitFillEvHint')
        : $t('page.trades.pnl.netProfitNoneHint'),
  },
]);
</script>

<template>
  <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
    <div
      v-for="row in rows"
      :key="row.label"
      class="bg-muted/50 flex flex-col gap-1 rounded-md p-3"
    >
      <span class="text-muted-foreground text-xs">{{ row.label }}</span>
      <span
        :class="row.signClass"
        class="font-mono text-base font-semibold tabular-nums"
      >
        {{ row.value }}
      </span>
      <span
        v-if="row.hint"
        class="text-muted-foreground text-[10px] leading-tight"
      >
        {{ row.hint }}
      </span>
    </div>
  </div>
</template>
