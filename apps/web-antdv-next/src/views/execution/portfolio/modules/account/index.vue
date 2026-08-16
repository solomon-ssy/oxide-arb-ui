<script lang="ts" setup>
import type { TableColumnsType } from 'antdv-next';
import type { Dayjs } from 'dayjs';

import type {
  EquitySnapshotView,
  IncentiveReconciliationView,
  LiveAccountView,
  VenuePositionSnapshotView,
} from '@vben/types';

import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
} from 'vue';
import { useRoute } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Alert, Button, DatePicker, Empty, Table, Tag } from 'antdv-next';

import { getLiveAccount, listEquitySnapshots } from '#/api/account';
import { getIncentiveReconciliation } from '#/api/incentives';
import { $t } from '#/locales';
import {
  formatDateTimeLocal,
  formatPercent,
  formatPrice,
  formatShares,
  formatUsd,
  truncateHexId,
} from '#/shared/components/format';
import InsightPanel from '#/shared/components/insight-panel.vue';
import KpiCard from '#/shared/components/kpi-card.vue';
import { useQpAccess } from '#/shared/composables/use-qp-access';

import EquityChart from './modules/widgets/equity-chart.vue';
import EquitySnapshotDrawer from './modules/widgets/equity-snapshot-drawer.vue';
import ExposureBreakdownPanel from './modules/widgets/exposure-breakdown.vue';

defineOptions({ name: 'PortfolioAccountModule' });

const RangePicker = DatePicker.RangePicker;

const { handleRequest } = useRequestHandler();
const { hasAccessByCodes } = useQpAccess();
const route = useRoute();
const accountModuleRef = useTemplateRef<HTMLElement>('accountModuleRef');
let tableMutationObserver: MutationObserver | null = null;
let tableResizeObserver: null | ResizeObserver = null;

const activeModule = computed(() =>
  typeof route.query.module === 'string' ? route.query.module : 'account',
);
const showAccount = computed(() => activeModule.value === 'account');
const showExposure = computed(() => activeModule.value === 'exposure');
const showEquity = computed(() => activeModule.value === 'equity');

const canReadEquity = hasAccessByCodes(['equity_snapshot:read']);

/** Ceiling on a single ranged equity fetch — bounds the curve + table together. */
const EQUITY_FETCH_CAP = 500;

function syncScrollableTables() {
  const root = accountModuleRef.value;
  if (!root) return;
  const regions = root.querySelectorAll<HTMLElement>('.ant-table-content');
  for (const region of regions) {
    const scrollable =
      region.scrollWidth > region.clientWidth ||
      region.scrollHeight > region.clientHeight;
    if (!scrollable) {
      region.removeAttribute('aria-label');
      region.removeAttribute('role');
      region.removeAttribute('tabindex');
      continue;
    }
    region.setAttribute('aria-label', $t('common.scrollableTableBody'));
    region.setAttribute('role', 'region');
    region.tabIndex = 0;
  }
}

function scheduleScrollableTableSync() {
  void nextTick(syncScrollableTables);
}

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
  {
    dataIndex: 'outcome',
    title: $t('page.quantAccount.positions.outcome'),
    width: 120,
  },
  {
    dataIndex: 'token_id',
    key: 'token',
    title: $t('page.quantAccount.positions.token'),
    width: 140,
  },
  {
    dataIndex: 'market_id',
    key: 'market',
    title: $t('page.quantAccount.positions.market'),
    width: 140,
  },
  {
    align: 'right',
    dataIndex: 'size',
    title: $t('page.quantAccount.positions.size'),
    width: 110,
  },
  {
    align: 'right',
    dataIndex: 'avg_price',
    key: 'avg',
    title: $t('page.quantAccount.positions.avgPrice'),
    width: 110,
  },
  {
    align: 'right',
    dataIndex: 'cur_price',
    key: 'cur',
    title: $t('page.quantAccount.positions.curPrice'),
    width: 110,
  },
  {
    align: 'right',
    dataIndex: 'current_value',
    key: 'value',
    title: $t('page.quantAccount.positions.value'),
    width: 130,
  },
  {
    align: 'center',
    dataIndex: 'redeemable',
    key: 'redeemable',
    title: $t('page.quantAccount.positions.redeemable'),
    width: 100,
  },
];

// ── Equity snapshots (single ranged fetch feeds both the curve and the table) ─
const range = ref<[Dayjs, Dayjs] | null>(null);
const equitySnapshots = ref<EquitySnapshotView[]>([]);
const incentiveReconciliation = ref<IncentiveReconciliationView | null>(null);
const equityLoading = ref(false);

const incentiveHealthColor = computed(() => {
  switch (incentiveReconciliation.value?.health) {
    case 'healthy': {
      return 'success';
    }
    case 'incomplete':
    case 'stale': {
      return 'warning';
    }
    default: {
      return 'error';
    }
  }
});

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
  const [page, reconciliation] = await Promise.all([
    handleRequest(() =>
      listEquitySnapshots({
        from: range.value?.[0]?.toISOString(),
        size: EQUITY_FETCH_CAP,
        to: range.value?.[1]?.toISOString(),
      }),
    ),
    handleRequest(getIncentiveReconciliation),
  ]);
  equitySnapshots.value = page?.items ?? [];
  incentiveReconciliation.value = reconciliation ?? null;
  equityLoading.value = false;
}

const equityColumns: TableColumnsType<EquitySnapshotView> = [
  {
    dataIndex: 'as_of',
    key: 'as_of',
    title: $t('page.quantAccount.fields.asOf'),
    width: 180,
  },
  {
    align: 'right',
    dataIndex: 'venue_net_liquidation_usd',
    key: 'netLiq',
    title: $t('page.quantAccount.fields.netLiq'),
    width: 160,
  },
  {
    align: 'right',
    dataIndex: 'incentive_credit_cumulative_usd',
    key: 'incentiveCredit',
    title: $t('page.quantAccount.fields.incentiveCredit'),
    width: 170,
  },
  {
    align: 'right',
    dataIndex: 'realized_pnl_cumulative_usd',
    key: 'realized',
    title: $t('page.quantAccount.fields.realizedPnl'),
    width: 160,
  },
  {
    align: 'right',
    dataIndex: 'unrealized_pnl_usd',
    key: 'unrealized',
    title: $t('page.quantAccount.fields.unrealizedPnl'),
    width: 150,
  },
  {
    align: 'right',
    dataIndex: 'drawdown_pct',
    key: 'drawdown',
    title: $t('page.quantAccount.fields.drawdown'),
    width: 120,
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
  if (showAccount.value || showExposure.value) void loadLiveAccount();
  if (showEquity.value) void loadEquity();
  scheduleScrollableTableSync();
  const root = accountModuleRef.value;
  if (root) {
    tableMutationObserver = new MutationObserver(scheduleScrollableTableSync);
    tableMutationObserver.observe(root, { childList: true, subtree: true });
    tableResizeObserver = new ResizeObserver(scheduleScrollableTableSync);
    tableResizeObserver.observe(root);
  }
});

onBeforeUnmount(() => {
  tableMutationObserver?.disconnect();
  tableResizeObserver?.disconnect();
});
</script>

<template>
  <Page auto-content-height>
    <div ref="accountModuleRef" class="flex flex-col gap-4">
      <template v-if="showAccount">
        <!-- Live account collateral -->
        <InsightPanel
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
              <KpiCard
                :title="$t('page.quantAccount.fields.netLiq')"
                :value="formatUsd(liveAccount.venue_net_liquidation_usd)"
              />
              <KpiCard
                :title="$t('page.quantAccount.fields.capitalBase')"
                :value="formatUsd(liveAccount.capital_base_usd)"
              />
              <KpiCard
                :title="$t('page.quantAccount.fields.available')"
                :value="formatUsd(liveAccount.available_usd)"
              />
              <KpiCard
                :title="$t('page.quantAccount.fields.reserved')"
                :value="formatUsd(liveAccount.reserved_usd)"
              />
              <KpiCard
                :title="$t('page.quantAccount.fields.budgetCap')"
                :value="formatUsd(liveAccount.budget_cap_usd)"
              />
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
          <div
            v-else-if="accountLoading"
            class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5"
          >
            <KpiCard
              v-for="field in [
                'netLiq',
                'capitalBase',
                'available',
                'reserved',
                'budgetCap',
              ]"
              :key="field"
              :loading="true"
              :title="$t(`page.quantAccount.fields.${field}`)"
              value=""
            />
          </div>
          <Empty
            v-else
            :description="$t('page.quantAccount.live.unavailable')"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </InsightPanel>

        <!-- Venue positions -->
        <InsightPanel
          :title="$t('page.quantAccount.positions.title')"
          icon="lucide:table"
          tone="sky"
        >
          <Table
            :columns="positionColumns"
            :data-source="positions"
            :loading="accountLoading"
            :pagination="false"
            :scroll="{ x: 960 }"
            row-key="token_id"
            size="small"
          >
            <template #emptyText>
              <Empty
                :description="$t('page.quantAccount.positions.empty')"
                :image="Empty.PRESENTED_IMAGE_SIMPLE"
              />
            </template>
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
        </InsightPanel>
      </template>

      <!-- Exposure breakdown -->
      <ExposureBreakdownPanel
        v-if="showExposure"
        :exposures="liveAccount?.exposures ?? null"
      />

      <!-- Equity history (curve + table), gated on equity_snapshot:read -->
      <template v-if="showEquity && canReadEquity">
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

        <InsightPanel
          :title="$t('page.quantAccount.incentives.title')"
          icon="lucide:badge-dollar-sign"
          tone="amber"
        >
          <template #extra>
            <Tag
              v-if="incentiveReconciliation"
              :color="incentiveHealthColor"
              data-testid="incentive-reconciliation-health"
            >
              {{
                $t(
                  `page.quantAccount.incentives.health.${incentiveReconciliation.health}`,
                )
              }}
            </Tag>
          </template>
          <div
            v-if="incentiveReconciliation"
            class="flex flex-col gap-3"
            data-testid="incentive-reconciliation"
          >
            <Alert
              :message="$t('page.quantAccount.incentives.attributionOnly')"
              show-icon
              type="info"
            />
            <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiCard
                :title="$t('page.quantAccount.incentives.estimated')"
                :value="
                  formatUsd(incentiveReconciliation.estimated_maker_accrual_usd)
                "
              />
              <KpiCard
                :title="$t('page.quantAccount.incentives.awarded')"
                :value="
                  formatUsd(incentiveReconciliation.venue_awarded_maker_usd)
                "
              />
              <KpiCard
                :title="$t('page.quantAccount.incentives.makerCredited')"
                :value="
                  formatUsd(incentiveReconciliation.wallet_credited_maker_usd)
                "
              />
              <KpiCard
                :title="$t('page.quantAccount.incentives.takerCredited')"
                :value="
                  formatUsd(incentiveReconciliation.wallet_credited_taker_usd)
                "
              />
            </div>
            <div
              class="text-muted-foreground grid gap-1 text-xs md:grid-cols-2"
            >
              <span>
                {{ $t('page.quantAccount.incentives.estimateAwardDelta') }}:
                {{
                  formatUsd(incentiveReconciliation.estimate_to_award_delta_usd)
                }}
              </span>
              <span>
                {{ $t('page.quantAccount.incentives.awardCreditDelta') }}:
                {{
                  formatUsd(incentiveReconciliation.award_to_credit_delta_usd)
                }}
              </span>
              <span>
                {{ $t('page.quantAccount.incentives.lastSuccess') }}:
                {{
                  incentiveReconciliation.last_success_at
                    ? formatDateTimeLocal(
                        incentiveReconciliation.last_success_at,
                      )
                    : $t('page.quantAccount.incentives.unavailable')
                }}
              </span>
              <span>
                {{ $t('page.quantAccount.incentives.incompleteDays') }}:
                {{ incentiveReconciliation.incomplete_day_count }}
                <template v-if="incentiveReconciliation.oldest_incomplete_date">
                  · {{ $t('page.quantAccount.incentives.oldestIncomplete') }}
                  {{ incentiveReconciliation.oldest_incomplete_date }}
                </template>
              </span>
            </div>
            <Alert
              v-if="incentiveReconciliation.below_payout_threshold"
              :message="
                $t('page.quantAccount.incentives.belowThreshold', {
                  threshold: formatUsd(
                    incentiveReconciliation.payout_threshold_usd,
                  ),
                })
              "
              show-icon
              type="warning"
            />
          </div>
          <Empty
            v-else
            :description="$t('page.quantAccount.incentives.unavailable')"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </InsightPanel>

        <InsightPanel
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
            :scroll="{ x: 770 }"
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
              <template v-else-if="column.key === 'incentiveCredit'">
                {{ formatUsd(record.incentive_credit_cumulative_usd) }}
              </template>
              <template v-else-if="column.key === 'unrealized'">
                {{ formatUsd(record.unrealized_pnl_usd) }}
              </template>
              <template v-else-if="column.key === 'drawdown'">
                {{ formatPercent(record.drawdown_pct) }}
              </template>
            </template>
          </Table>
        </InsightPanel>
      </template>
    </div>

    <SnapshotDrawer />
  </Page>
</template>
