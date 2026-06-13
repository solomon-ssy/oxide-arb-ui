<script lang="ts" setup>
import type { AuditOutcome, OpportunityAuditView } from '@vben/types';

import { computed } from 'vue';

import {
  Collapse,
  CollapsePanel,
  Empty,
  Spin,
  Tag,
  Timeline,
  TimelineItem,
} from 'antdv-next';

import { $t } from '#/locales';
import {
  formatDateTimeLocal,
  formatPrice,
  formatShares,
  formatUsd,
  truncateHexId,
} from '#/shared/components/format';

defineOptions({ name: 'AuditTimeline' });

const props = withDefaults(
  defineProps<{
    /** Audit-trail stages, as returned by `GET /opportunities/{id}`. */
    items: OpportunityAuditView[];
    loading?: boolean;
  }>(),
  { loading: false },
);

/** Stages sorted by lifecycle position (backend already orders, keep stable). */
const ordered = computed(() =>
  props.items.toSorted((a, b) => a.stage_order - b.stage_order),
);

const OUTCOME_COLOR: Record<AuditOutcome, string> = {
  failed: 'red',
  miss: 'gray',
  rejected: 'red',
  settled: 'green',
  success: 'green',
};

function dotColor(row: OpportunityAuditView): string {
  if (row.outcome) {
    return OUTCOME_COLOR[row.outcome] ?? 'blue';
  }
  return row.stage.endsWith('_rejected') ? 'red' : 'blue';
}

/** Milliseconds from detection to this stage, rendered compactly. */
function stageLatency(row: OpportunityAuditView): null | string {
  const detected = Date.parse(row.detected_at);
  const at = Date.parse(row.stage_at);
  if (Number.isNaN(detected) || Number.isNaN(at) || at < detected) {
    return null;
  }
  const ms = at - detected;
  if (ms < 1000) {
    return `+${ms}ms`;
  }
  if (ms < 60_000) {
    return `+${(ms / 1000).toFixed(1)}s`;
  }
  return `+${Math.round(ms / 60_000)}m`;
}

interface MetricEntry {
  label: string;
  value: string;
}

/** Non-null execution / settlement numbers shown under the stage header. */
function metrics(row: OpportunityAuditView): MetricEntry[] {
  const entries: MetricEntry[] = [];
  const push = (key: string, value: null | string) => {
    if (value !== null) {
      entries.push({ label: $t(`page.opportunities.audit.${key}`), value });
    }
  };
  push('entryPrice', row.entry_price && formatPrice(row.entry_price));
  push('fillPrice', row.fill_price && formatPrice(row.fill_price));
  push(
    'requestedShares',
    row.requested_shares && formatShares(row.requested_shares),
  );
  push('filledShares', row.filled_shares && formatShares(row.filled_shares));
  push('fees', row.fees_usd && formatUsd(row.fees_usd));
  push('netProfit', row.net_profit_usd && formatUsd(row.net_profit_usd));
  push('payout', row.payout_usd && formatUsd(row.payout_usd));
  push('realizedPnl', row.realized_pnl_usd && formatUsd(row.realized_pnl_usd));
  return entries;
}

function snapshotJson(row: OpportunityAuditView): string {
  return JSON.stringify(row.scored_snapshot, null, 2);
}
</script>

<template>
  <Spin :spinning="loading">
    <Empty
      v-if="ordered.length === 0 && !loading"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />
    <Timeline v-else>
      <TimelineItem
        v-for="row in ordered"
        :key="`${row.stage}-${row.execution_id}`"
        :color="dotColor(row)"
      >
        <div class="flex flex-col gap-1.5 pb-2">
          <div class="flex flex-wrap items-center gap-2">
            <Tag :color="dotColor(row)">
              {{ $t(`enum.opportunityAuditStage.${row.stage}`) }}
            </Tag>
            <Tag v-if="row.outcome">
              {{ $t(`enum.auditOutcome.${row.outcome}`) }}
            </Tag>
            <span class="text-muted-foreground text-xs">
              {{ formatDateTimeLocal(row.stage_at) }}
              <template v-if="stageLatency(row)">
                · {{ stageLatency(row) }}
              </template>
            </span>
          </div>
          <div
            v-if="row.rejection_stage || row.rejection_reason"
            class="text-xs"
          >
            <span v-if="row.rejection_stage" class="font-medium">
              {{ $t(`enum.rejectionStage.${row.rejection_stage}`) }}：
            </span>
            <span class="text-muted-foreground">
              {{
                row.rejection_reason ?? $t('page.opportunities.audit.noReason')
              }}
            </span>
          </div>
          <div
            v-if="metrics(row).length > 0"
            class="text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-xs tabular-nums"
          >
            <span v-for="metric in metrics(row)" :key="metric.label">
              {{ metric.label }} {{ metric.value }}
            </span>
          </div>
          <div
            v-if="row.trade_id"
            class="text-muted-foreground font-mono text-xs"
          >
            {{ $t('page.opportunities.audit.tradeId') }}
            {{ truncateHexId(row.trade_id, 8, 4) }}
          </div>
          <Collapse v-if="row.scored_snapshot" ghost size="small">
            <CollapsePanel
              key="snapshot"
              :header="$t('page.opportunities.audit.snapshot')"
            >
              <div
                class="bg-muted max-h-64 overflow-auto rounded-md p-2 font-mono text-xs whitespace-pre"
              >
                {{ snapshotJson(row) }}
              </div>
            </CollapsePanel>
          </Collapse>
        </div>
      </TimelineItem>
    </Timeline>
  </Spin>
</template>
