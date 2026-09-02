<script lang="ts" setup>
import type { TableColumnsType, TablePaginationConfig } from 'antdv-next';
import type { Dayjs } from 'dayjs';

import type {
  IncentiveReconciliationView,
  VenueIncentiveEventQuery,
  VenueIncentiveEventView,
  VenueIncentiveKind,
  VenueIncentiveStage,
} from '@vben/types';

import { computed, onMounted, onScopeDispose, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import {
  Alert,
  Button,
  DatePicker,
  Empty,
  message,
  Select,
  Skeleton,
  Table,
  Tag,
} from 'antdv-next';

import {
  getIncentiveReconciliation,
  listIncentiveEvents,
} from '#/api/incentives';
import { $t } from '#/locales';
import { LatestRequestOwner } from '#/shared/async/latest-request-owner';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import {
  EMPTY_PLACEHOLDER,
  formatDateTimeLocal,
  formatUsd,
  truncateHexId,
} from '#/shared/components/format';
import InsightPanel from '#/shared/components/insight-panel.vue';
import KpiCard from '#/shared/components/kpi-card.vue';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { vAccessibleTableScroll } from '#/shared/directives/accessible-table-scroll';
import { centerTableColumns } from '#/shared/table/center-columns';

defineOptions({ name: 'PortfolioIncentivesModule' });

const { handleRequest } = useRequestHandler();
const { hasAccessByCodes } = useQpAccess();
const canRead = hasAccessByCodes(['account_snapshot:read']);

const reconciliation = ref<IncentiveReconciliationView | null>(null);
const events = ref<VenueIncentiveEventView[]>([]);
const loading = ref(false);
const loaded = ref(false);
const failed = ref({ health: false, ledger: false });
const requestOwner = new LatestRequestOwner();
const page = ref(1);
const size = ref(20);
const total = ref(0);
const kind = ref<VenueIncentiveKind>();
const stage = ref<VenueIncentiveStage>();
const programDate = ref<Dayjs | null>(null);

const healthColor = computed(() => {
  switch (reconciliation.value?.health) {
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

const kindOptions = computed(() =>
  (['maker_rebate', 'taker_rebate'] as const).map((value) => ({
    label: $t(`enum.venueIncentiveKind.${value}`),
    value,
  })),
);
const stageOptions = computed(() =>
  (
    ['estimated_accrual', 'venue_reported_accrual', 'wallet_credited'] as const
  ).map((value) => ({
    label: $t(`enum.venueIncentiveStage.${value}`),
    value,
  })),
);

const columns: TableColumnsType<VenueIncentiveEventView> = [
  {
    dataIndex: 'program_date',
    key: 'program_date',
    title: $t('page.quantAccount.incentives.ledger.programDate'),
    width: 120,
  },
  {
    dataIndex: 'kind',
    key: 'kind',
    title: $t('page.quantAccount.incentives.ledger.kind'),
    width: 140,
  },
  {
    dataIndex: 'stage',
    key: 'stage',
    title: $t('page.quantAccount.incentives.ledger.stage'),
    width: 150,
  },
  {
    dataIndex: 'amount_usd',
    key: 'amount_usd',
    title: $t('page.quantAccount.incentives.ledger.amount'),
    width: 120,
  },
  {
    dataIndex: 'market_id',
    key: 'market_id',
    title: $t('page.quantAccount.incentives.ledger.market'),
    width: 160,
  },
  {
    dataIndex: 'clob_trade_observation_id',
    key: 'clob_trade_observation_id',
    title: $t('page.quantAccount.incentives.ledger.fill'),
    width: 160,
  },
  {
    dataIndex: 'transaction_hash',
    key: 'transaction_hash',
    title: $t('page.quantAccount.incentives.ledger.transaction'),
    width: 180,
  },
  {
    dataIndex: 'source_terms_hash',
    key: 'source_terms_hash',
    title: $t('page.quantAccount.incentives.ledger.termsHash'),
    width: 180,
  },
  {
    dataIndex: 'available_at',
    key: 'available_at',
    title: $t('page.quantAccount.incentives.ledger.availableAt'),
    width: 190,
  },
];

async function load() {
  if (!canRead) return;
  const request = requestOwner.begin();
  loading.value = true;
  const query: VenueIncentiveEventQuery = {
    kind: kind.value,
    page: page.value,
    program_date: programDate.value?.format('YYYY-MM-DD'),
    size: size.value,
    stage: stage.value,
  };
  const [health, ledger] = await Promise.all([
    handleRequest(getIncentiveReconciliation),
    handleRequest(() => listIncentiveEvents(query)),
  ]);
  request.commit(() => {
    if (health !== null) reconciliation.value = health;
    events.value = ledger?.items ?? [];
    total.value = ledger?.total ?? 0;
    if (ledger !== null) {
      page.value = ledger.page;
      size.value = ledger.size;
    }
    failed.value = { health: health === null, ledger: ledger === null };
    loaded.value = true;
    loading.value = false;
  });
}

function applyFilters() {
  page.value = 1;
  void load();
}

function resetFilters() {
  kind.value = undefined;
  stage.value = undefined;
  programDate.value = null;
  page.value = 1;
  void load();
}

function onTableChange(pagination: TablePaginationConfig) {
  page.value = pagination.current ?? 1;
  size.value = pagination.pageSize ?? 20;
  void load();
}

async function copy(value?: null | string) {
  if (!value || !navigator.clipboard) return;
  await navigator.clipboard.writeText(value);
  void message.success($t('page.quantAccount.incentives.ledger.copied'));
}

function referenceValue(
  record: VenueIncentiveEventView,
  key: string,
): null | string | undefined {
  switch (key) {
    case 'clob_trade_observation_id': {
      return record.clob_trade_observation_id;
    }
    case 'market_id': {
      return record.market_id;
    }
    case 'source_terms_hash': {
      return record.source_terms_hash;
    }
    case 'transaction_hash': {
      return record.transaction_hash;
    }
    default: {
      return undefined;
    }
  }
}

function isZeroAmount(value: string): boolean {
  return /^0(?:\.0+)?$/.test(value);
}

onMounted(load);
onScopeDispose(() => requestOwner.invalidate());
</script>

<template>
  <Page>
    <div class="flex min-w-0 flex-col gap-4" data-testid="incentive-page">
      <Alert
        v-if="!canRead"
        :message="$t('page.quantAccount.incentives.forbidden')"
        show-icon
        type="warning"
      />

      <InsightPanel
        v-else
        :title="$t('page.quantAccount.incentives.title')"
        icon="lucide:badge-dollar-sign"
        tone="amber"
      >
        <template #extra>
          <Tag
            v-if="reconciliation"
            :color="healthColor"
            data-testid="incentive-reconciliation-health"
          >
            {{
              $t(`page.quantAccount.incentives.health.${reconciliation.health}`)
            }}
          </Tag>
        </template>
        <Alert
          v-if="failed.health"
          :message="$t('page.quantAccount.incentives.loadError')"
          data-testid="incentive-reconciliation-error"
          show-icon
          type="error"
        >
          <template #action>
            <Button :loading="loading" size="small" @click="load">
              {{ $t('page.shared.asyncState.retry') }}
            </Button>
          </template>
        </Alert>
        <Skeleton
          v-if="!loaded"
          :aria-label="$t('page.quantAccount.incentives.loading')"
          active
          aria-busy="true"
          data-testid="incentive-reconciliation-loading"
          :paragraph="{ rows: 4 }"
          role="status"
        />
        <div
          v-else-if="reconciliation"
          class="flex flex-col gap-3"
          data-testid="incentive-reconciliation"
        >
          <Alert
            :message="$t('page.quantAccount.incentives.attributionOnly')"
            show-icon
            type="info"
          />
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              :title="$t('page.quantAccount.incentives.estimated')"
              :value="formatUsd(reconciliation.estimated_maker_accrual_usd)"
            />
            <KpiCard
              :title="$t('page.quantAccount.incentives.awarded')"
              :value="
                formatUsd(reconciliation.venue_reported_maker_accrual_usd)
              "
            />
            <KpiCard
              :title="$t('page.quantAccount.incentives.makerCredited')"
              :value="formatUsd(reconciliation.wallet_credited_maker_usd)"
            />
            <KpiCard
              :title="$t('page.quantAccount.incentives.takerCredited')"
              :value="formatUsd(reconciliation.wallet_credited_taker_usd)"
            />
          </div>
          <div class="text-muted-foreground grid gap-1 text-xs md:grid-cols-2">
            <span>
              {{ $t('page.quantAccount.incentives.estimateAwardDelta') }}:
              {{ formatUsd(reconciliation.estimate_to_reported_delta_usd) }}
            </span>
            <span>
              {{ $t('page.quantAccount.incentives.awardCreditDelta') }}:
              {{ formatUsd(reconciliation.reported_to_credit_delta_usd) }}
            </span>
            <span>
              {{ $t('page.quantAccount.incentives.lastSuccess') }}:
              {{
                reconciliation.last_success_at
                  ? formatDateTimeLocal(reconciliation.last_success_at)
                  : $t('page.quantAccount.incentives.unavailable')
              }}
            </span>
            <span>
              {{ $t('page.quantAccount.incentives.incompleteDays') }}:
              {{ reconciliation.incomplete_day_count }}
              <template v-if="reconciliation.oldest_incomplete_date">
                · {{ $t('page.quantAccount.incentives.oldestIncomplete') }}
                {{ reconciliation.oldest_incomplete_date }}
              </template>
            </span>
          </div>
          <Alert
            v-if="
              reconciliation.below_payout_threshold_program_dates.length > 0
            "
            :message="
              $t('page.quantAccount.incentives.belowThreshold', {
                dates:
                  reconciliation.below_payout_threshold_program_dates.join(
                    ', ',
                  ),
                threshold: formatUsd(reconciliation.payout_threshold_usd),
              })
            "
            show-icon
            type="warning"
          />
          <Alert
            v-if="reconciliation.overdue_program_dates.length > 0"
            :message="
              $t('page.quantAccount.incentives.overdueProgramDays', {
                dates: reconciliation.overdue_program_dates.join(', '),
              })
            "
            show-icon
            type="error"
          />
        </div>
        <Empty
          v-else-if="!failed.health"
          :description="$t('page.quantAccount.incentives.unavailable')"
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        />
      </InsightPanel>

      <InsightPanel
        v-if="canRead"
        :title="$t('page.quantAccount.incentives.ledger.title')"
        icon="lucide:list-filter"
        tone="indigo"
      >
        <div
          class="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
        >
          <Select
            v-model:value="kind"
            allow-clear
            :aria-label="$t('page.quantAccount.incentives.ledger.kind')"
            class="w-full sm:w-48"
            :options="kindOptions"
            :placeholder="$t('page.quantAccount.incentives.ledger.kind')"
          />
          <Select
            v-model:value="stage"
            allow-clear
            :aria-label="$t('page.quantAccount.incentives.ledger.stage')"
            class="w-full sm:w-52"
            :options="stageOptions"
            :placeholder="$t('page.quantAccount.incentives.ledger.stage')"
          />
          <DatePicker
            v-model:value="programDate"
            :aria-label="$t('page.quantAccount.incentives.ledger.programDate')"
            class="w-full sm:w-auto"
            :placeholder="$t('page.quantAccount.incentives.ledger.programDate')"
          />
          <div class="flex gap-2">
            <Button type="primary" @click="applyFilters">
              {{ $t('page.quantAccount.incentives.ledger.apply') }}
            </Button>
            <Button @click="resetFilters">
              {{ $t('page.quantAccount.incentives.ledger.reset') }}
            </Button>
          </div>
        </div>
        <Alert
          v-if="failed.ledger"
          :message="$t('page.quantAccount.incentives.ledger.loadError')"
          class="mb-3"
          data-testid="incentive-ledger-error"
          show-icon
          type="error"
        >
          <template #action>
            <Button :loading="loading" size="small" @click="load">
              {{ $t('page.shared.asyncState.retry') }}
            </Button>
          </template>
        </Alert>
        <Skeleton
          v-if="!loaded || (loading && events.length === 0)"
          :aria-label="$t('page.quantAccount.incentives.ledger.loading')"
          active
          aria-busy="true"
          data-testid="incentive-ledger-loading"
          :paragraph="{ rows: 4 }"
          role="status"
        />
        <div v-else-if="events.length > 0" class="min-w-0">
          <Table
            v-accessible-table-scroll="
              $t('page.quantAccount.incentives.ledger.scrollLabel')
            "
            :columns="centerTableColumns(columns) ?? columns"
            :data-source="events"
            :loading="loading"
            :pagination="{
              current: page,
              pageSize: size,
              total,
              showSizeChanger: true,
            }"
            :row-key="
              (row: VenueIncentiveEventView) => row.venue_incentive_event_id
            "
            :scroll="{ x: 1400 }"
            size="small"
            table-layout="fixed"
            @change="onTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'kind'">
                <Tag>{{ $t(`enum.venueIncentiveKind.${record.kind}`) }}</Tag>
              </template>
              <template v-else-if="column.key === 'stage'">
                {{ $t(`enum.venueIncentiveStage.${record.stage}`) }}
              </template>
              <template v-else-if="column.key === 'amount_usd'">
                <span class="font-mono">{{
                  formatUsd(record.amount_usd)
                }}</span>
                <Tag
                  v-if="isZeroAmount(record.amount_usd)"
                  class="ml-1"
                  color="red"
                >
                  {{ $t('page.quantAccount.incentives.ledger.retraction') }}
                </Tag>
              </template>
              <template v-else-if="column.key === 'market_id'">
                <EntityRouteLink
                  v-if="record.market_id"
                  mono
                  :label="truncateHexId(record.market_id, 10, 8)"
                  :to="`/trading/market-intelligence?module=live&entity=market&id=${record.market_id}`"
                />
                <span v-else>{{ EMPTY_PLACEHOLDER }}</span>
              </template>
              <template
                v-else-if="
                  [
                    'clob_trade_observation_id',
                    'transaction_hash',
                    'source_terms_hash',
                  ].includes(String(column.key))
                "
              >
                <Button
                  v-if="referenceValue(record, String(column.key))"
                  :aria-label="
                    $t('page.common.copyValue', {
                      label: String(column.title ?? column.key),
                    })
                  "
                  class="h-auto p-0 font-mono text-xs"
                  type="link"
                  @click="copy(referenceValue(record, String(column.key)))"
                >
                  {{
                    truncateHexId(
                      referenceValue(record, String(column.key)),
                      10,
                      8,
                    )
                  }}
                </Button>
                <span v-else>{{ EMPTY_PLACEHOLDER }}</span>
              </template>
              <template v-else-if="column.key === 'available_at'">
                {{ formatDateTimeLocal(record.available_at) }}
              </template>
            </template>
          </Table>
        </div>
        <Empty
          v-else-if="!failed.ledger"
          :description="$t('page.quantAccount.incentives.ledger.empty')"
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
          data-testid="incentive-ledger-empty"
        />
      </InsightPanel>
    </div>
  </Page>
</template>
