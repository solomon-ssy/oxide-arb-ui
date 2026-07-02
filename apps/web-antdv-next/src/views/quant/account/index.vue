<script lang="ts" setup>
import type { TableColumnsType } from 'antdv-next';
import type { Dayjs } from 'dayjs';

import type {
  EquitySnapshotView,
  LiveAccountView,
  VenuePositionSnapshotView,
} from '@vben/types';

import { computed, onMounted, ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Button, DatePicker, Empty, Table, Tag } from 'antdv-next';

import { getLiveAccount, listEquitySnapshots } from '#/api/account';
import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import {
  formatDateTimeLocal,
  formatPercent,
  formatPrice,
  formatShares,
  formatUsd,
  truncateHexId,
} from '#/shared/components/format';
import { useQpAccess } from '#/shared/composables/use-qp-access';

import EquityChart from './modules/widgets/equity-chart.vue';
import EquitySnapshotDrawer from './modules/widgets/equity-snapshot-drawer.vue';
import ExposureBreakdownPanel from './modules/widgets/exposure-breakdown.vue';

defineOptions({ name: 'QuantAccountPage' });

const RangePicker = DatePicker.RangePicker;

const { handleRequest } = useRequestHandler();
const { hasAccessByCodes } = useQpAccess();

const canReadEquity = hasAccessByCodes(['equity_snapshot:read']);

/** Ceiling on a single ranged equity fetch — bounds the curve + table together. */
const EQUITY_FETCH_CAP = 500;

// ── Live account ────────────────────────────────────────────────────────────
const liveAccount = ref<LiveAccountView | null>(null);
const accountLoading = ref(false);

async function loadLiveAccount() {
  accountLoading.value = true;
  liveAccount.value = await handleRequest(getLiveAccount);
  accountLoading.value = false;
}

const positions = computed<VenuePositionSnapshotView[]>(
  () => liveAccount.value?.positions ?? [],
);

const positionColumns: TableColumnsType<VenuePositionSnapshotView> = [
  { dataIndex: 'outcome', title: $t('page.quantAccount.positions.outcome') },
  {
    dataIndex: 'token_id',
    key: 'token',
    title: $t('page.quantAccount.positions.token'),
  },
  {
    dataIndex: 'market_id',
    key: 'market',
    title: $t('page.quantAccount.positions.market'),
  },
  {
    align: 'right',
    dataIndex: 'size',
    title: $t('page.quantAccount.positions.size'),
  },
  {
    align: 'right',
    dataIndex: 'avg_price',
    key: 'avg',
    title: $t('page.quantAccount.positions.avgPrice'),
  },
  {
    align: 'right',
    dataIndex: 'cur_price',
    key: 'cur',
    title: $t('page.quantAccount.positions.curPrice'),
  },
  {
    align: 'right',
    dataIndex: 'current_value',
    key: 'value',
    title: $t('page.quantAccount.positions.value'),
  },
  {
    align: 'center',
    dataIndex: 'redeemable',
    key: 'redeemable',
    title: $t('page.quantAccount.positions.redeemable'),
  },
];

// ── Equity snapshots (single ranged fetch feeds both the curve and the table) ─
const range = ref<[Dayjs, Dayjs] | null>(null);
const equitySnapshots = ref<EquitySnapshotView[]>([]);
const equityLoading = ref(false);

/** Chart wants ascending time; the table shows newest first. */
const equityAscending = computed(() =>
  equitySnapshots.value.toSorted((a, b) => a.as_of.localeCompare(b.as_of)),
);
const equityDescending = computed(() =>
  equitySnapshots.value.toSorted((a, b) => b.as_of.localeCompare(a.as_of)),
);

async function loadEquity() {
  if (!canReadEquity) {
    return;
  }
  equityLoading.value = true;
  const page = await handleRequest(() =>
    listEquitySnapshots({
      from: range.value?.[0]?.toISOString(),
      size: EQUITY_FETCH_CAP,
      to: range.value?.[1]?.toISOString(),
    }),
  );
  equitySnapshots.value = page?.items ?? [];
  equityLoading.value = false;
}

const equityColumns: TableColumnsType<EquitySnapshotView> = [
  {
    dataIndex: 'as_of',
    key: 'as_of',
    title: $t('page.quantAccount.fields.asOf'),
  },
  {
    align: 'right',
    dataIndex: 'venue_net_liquidation_usd',
    key: 'netLiq',
    title: $t('page.quantAccount.fields.netLiq'),
  },
  {
    align: 'right',
    dataIndex: 'realized_pnl_cumulative_usd',
    key: 'realized',
    title: $t('page.quantAccount.fields.realizedPnl'),
  },
  {
    align: 'right',
    dataIndex: 'unrealized_pnl_usd',
    key: 'unrealized',
    title: $t('page.quantAccount.fields.unrealizedPnl'),
  },
  {
    align: 'right',
    dataIndex: 'drawdown_pct',
    key: 'drawdown',
    title: $t('page.quantAccount.fields.drawdown'),
  },
];

const [SnapshotDrawer, snapshotDrawerApi] = useVbenDrawer({
  connectedComponent: EquitySnapshotDrawer,
  destroyOnClose: true,
});

function openSnapshot(snapshot: EquitySnapshotView) {
  snapshotDrawerApi.setData({ snapshot }).open();
}

onMounted(() => {
  void loadLiveAccount();
  void loadEquity();
});
</script>

<template>
  <Page auto-content-height>
    <div class="flex flex-col gap-4">
      <!-- Live account collateral -->
      <DashboardPanel
        :title="$t('page.quantAccount.live.title')"
        icon="lucide:wallet"
        tone="teal"
      >
        <template #extra>
          <Button
            :loading="accountLoading"
            size="small"
            @click="loadLiveAccount"
          >
            {{ $t('page.quantAccount.refresh') }}
          </Button>
        </template>
        <div v-if="liveAccount" class="flex flex-col gap-3">
          <div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <div class="flex flex-col gap-1">
              <span class="text-muted-foreground text-xs">
                {{ $t('page.quantAccount.fields.netLiq') }}
              </span>
              <span class="font-mono text-lg font-semibold tabular-nums">
                {{ formatUsd(liveAccount.venue_net_liquidation_usd) }}
              </span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-muted-foreground text-xs">
                {{ $t('page.quantAccount.fields.capitalBase') }}
              </span>
              <span class="font-mono text-lg font-semibold tabular-nums">
                {{ formatUsd(liveAccount.capital_base_usd) }}
              </span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-muted-foreground text-xs">
                {{ $t('page.quantAccount.fields.available') }}
              </span>
              <span class="font-mono text-lg font-semibold tabular-nums">
                {{ formatUsd(liveAccount.available_usd) }}
              </span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-muted-foreground text-xs">
                {{ $t('page.quantAccount.fields.reserved') }}
              </span>
              <span class="font-mono text-lg font-semibold tabular-nums">
                {{ formatUsd(liveAccount.reserved_usd) }}
              </span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-muted-foreground text-xs">
                {{ $t('page.quantAccount.fields.budgetCap') }}
              </span>
              <span class="font-mono text-lg font-semibold tabular-nums">
                {{ formatUsd(liveAccount.budget_cap_usd) }}
              </span>
            </div>
          </div>
          <div
            class="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-xs"
          >
            <span>
              {{ $t('page.quantAccount.fields.source') }}:
              {{ $t(`enum.accountSource.${liveAccount.source}`) }}
            </span>
            <span>
              {{ $t('page.quantAccount.fields.checkedAt') }}:
              {{ formatDateTimeLocal(liveAccount.fetched_at) }}
            </span>
          </div>
        </div>
        <Empty
          v-else-if="!accountLoading"
          :description="$t('page.quantAccount.live.unavailable')"
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        />
      </DashboardPanel>

      <!-- Venue positions -->
      <DashboardPanel
        :title="$t('page.quantAccount.positions.title')"
        icon="lucide:table"
        tone="sky"
      >
        <Table
          :columns="positionColumns"
          :data-source="positions"
          :pagination="false"
          row-key="token_id"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'token'">
              <span class="font-mono text-xs">
                {{ truncateHexId(record.token_id) }}
              </span>
            </template>
            <template v-else-if="column.key === 'market'">
              <span class="font-mono text-xs">
                {{ truncateHexId(record.market_id) }}
              </span>
            </template>
            <template v-else-if="column.key === 'avg'">
              {{ formatPrice(record.avg_price) }}
            </template>
            <template v-else-if="column.key === 'cur'">
              {{ formatPrice(record.cur_price) }}
            </template>
            <template v-else-if="column.key === 'value'">
              {{ formatUsd(record.current_value) }}
            </template>
            <template v-else-if="column.dataIndex === 'size'">
              {{ formatShares(record.size) }}
            </template>
            <template v-else-if="column.key === 'redeemable'">
              <Tag :color="record.redeemable ? 'success' : 'default'">
                {{
                  record.redeemable
                    ? $t('page.quantAccount.positions.yes')
                    : $t('page.quantAccount.positions.no')
                }}
              </Tag>
            </template>
          </template>
        </Table>
      </DashboardPanel>

      <!-- Exposure breakdown -->
      <ExposureBreakdownPanel :exposures="liveAccount?.exposures ?? null" />

      <!-- Equity history (curve + table), gated on equity_snapshot:read -->
      <template v-if="canReadEquity">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">
            {{ $t('page.quantAccount.equity.range') }}
          </span>
          <RangePicker v-model:value="range" show-time @change="loadEquity" />
          <Button :loading="equityLoading" size="small" @click="loadEquity">
            {{ $t('page.quantAccount.refresh') }}
          </Button>
        </div>

        <EquityChart :loading="equityLoading" :snapshots="equityAscending" />

        <DashboardPanel
          :title="$t('page.quantAccount.equity.title')"
          icon="lucide:history"
          tone="indigo"
        >
          <Table
            :columns="equityColumns"
            :data-source="equityDescending"
            :loading="equityLoading"
            :pagination="{ pageSize: 20, size: 'small' }"
            :row-key="(row: EquitySnapshotView) => row.equity_snapshot_id"
            :custom-row="
              (row: EquitySnapshotView) => ({
                onClick: () => openSnapshot(row),
              })
            "
            class="cursor-pointer"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'as_of'">
                {{ formatDateTimeLocal(record.as_of) }}
              </template>
              <template v-else-if="column.key === 'netLiq'">
                {{ formatUsd(record.venue_net_liquidation_usd) }}
              </template>
              <template v-else-if="column.key === 'realized'">
                {{ formatUsd(record.realized_pnl_cumulative_usd) }}
              </template>
              <template v-else-if="column.key === 'unrealized'">
                {{ formatUsd(record.unrealized_pnl_usd) }}
              </template>
              <template v-else-if="column.key === 'drawdown'">
                {{ formatPercent(record.drawdown_pct) }}
              </template>
            </template>
          </Table>
        </DashboardPanel>
      </template>
    </div>

    <SnapshotDrawer />
  </Page>
</template>
