<script lang="ts" setup>
import type {
  BasisAlertView,
  GroundingSpanView,
  MarketLinkageDetailView,
  MarketLinkageHistoryEntryView,
} from '@vben/types';

import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  Table,
  Tag,
} from 'antdv-next';

import { getMarketLinkageHistory, listBasisAlerts } from '#/api/vertical-alpha';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import {
  findTagOption,
  useLinkageStatusTagOptions,
  useResolverTierTagOptions,
} from '#/shared/components/format/tag-options';

defineOptions({ name: 'LinkageDetailDrawer' });

interface DrawerData {
  detail: MarketLinkageDetailView;
}

const detail = ref<MarketLinkageDetailView | null>(null);
const history = ref<MarketLinkageHistoryEntryView[]>([]);
const historyLoading = ref(false);
const basisAlerts = ref<BasisAlertView[]>([]);
const basisAlertTotal = ref(0);
const basisAlertsLoading = ref(false);
const { handleRequest } = useRequestHandler();

const statusTag = computed(() =>
  findTagOption(useLinkageStatusTagOptions(), detail.value?.status),
);
const tierTag = computed(() =>
  findTagOption(useResolverTierTagOptions(), detail.value?.resolver_tier),
);

const outcome = computed(() => detail.value?.outcome ?? null);
const binding = computed(() =>
  outcome.value?.status === 'resolved' ? outcome.value : null,
);
const unresolvedReason = computed(() =>
  outcome.value?.status === 'unresolved' ? outcome.value.reason : null,
);

const comparatorLabel = computed(() => {
  const comparator = binding.value?.subject.comparator;
  if (!comparator) {
    return '';
  }
  return comparator.kind === 'between'
    ? `${$t(`enum.priceComparator.${comparator.kind}`)} (${comparator.hi})`
    : $t(`enum.priceComparator.${comparator.kind}`);
});

const oracleLabel = computed(() => {
  const oracle = binding.value?.subject.resolution_oracle;
  if (!oracle) {
    return '';
  }
  switch (oracle.kind) {
    case 'binance_kline': {
      return `${$t('enum.resolutionOracle.binance_kline')} · ${oracle.symbol} @ ${oracle.interval}`;
    }
    case 'chainlink_data_streams': {
      return `${$t('enum.resolutionOracle.chainlink_data_streams')} · ${oracle.feed}`;
    }
    case 'other': {
      return `${$t('enum.resolutionOracle.other')} · ${oracle.descriptor}`;
    }
    default: {
      return '';
    }
  }
});

/** Basis cross-check applies only when settlement oracle is Chainlink. */
const basisCheckApplicable = computed(
  () =>
    binding.value?.subject.resolution_oracle.kind === 'chainlink_data_streams',
);

const basisAlertsPageLink = computed(() =>
  detail.value
    ? {
        path: '/research/basis-alerts',
        query: { market_id: detail.value.market_id },
      }
    : { path: '/research/basis-alerts' },
);

const groundingKindColor = (kind: GroundingSpanView['kind']) =>
  kind === 'literal_span' ? 'blue' : 'default';

const groundingColumns = [
  {
    dataIndex: 'subject_field',
    key: 'subject_field',
    title: $t('page.research.marketLinkages.detail.grounding.field'),
  },
  {
    dataIndex: 'source',
    key: 'source',
    title: $t('page.research.marketLinkages.detail.grounding.source'),
  },
  {
    dataIndex: 'text',
    key: 'text',
    title: $t('page.research.marketLinkages.detail.grounding.span'),
  },
  {
    dataIndex: 'kind',
    key: 'kind',
    title: $t('page.research.marketLinkages.detail.grounding.kind'),
  },
];

const historyColumns = [
  {
    dataIndex: 'derived_at',
    key: 'derived_at',
    title: $t('page.research.marketLinkages.detail.history.derivedAt'),
  },
  {
    dataIndex: 'status',
    key: 'status',
    title: $t('page.research.marketLinkages.detail.history.status'),
  },
  {
    dataIndex: 'resolver_tier',
    key: 'resolver_tier',
    title: $t('page.research.marketLinkages.detail.history.tier'),
  },
  {
    dataIndex: 'actor',
    key: 'actor',
    title: $t('page.research.marketLinkages.detail.history.actor'),
  },
  {
    dataIndex: 'reason',
    key: 'reason',
    title: $t('page.research.marketLinkages.detail.history.reason'),
  },
];

const historyRows = computed(() =>
  history.value.map((row) => ({
    actor:
      row.outcome.status === 'resolved'
        ? (row.outcome.override_context?.actor ?? '—')
        : '—',
    derived_at: formatDateTimeLocal(row.derived_at),
    key: row.linkage_id,
    reason:
      row.outcome.status === 'resolved'
        ? (row.outcome.override_context?.reason ?? '—')
        : row.outcome.reason,
    resolver_tier: row.resolver_tier,
    status: row.status,
  })),
);

const basisAlertColumns = [
  {
    dataIndex: 'as_of',
    key: 'as_of',
    title: $t('page.research.basisAlerts.columns.asOf'),
    width: 168,
  },
  {
    dataIndex: 'basis_bps',
    key: 'basis_bps',
    title: $t('page.research.basisAlerts.columns.basisBps'),
    width: 110,
  },
  {
    dataIndex: 'threshold_bps',
    key: 'threshold_bps',
    title: $t('page.research.basisAlerts.columns.thresholdBps'),
    width: 110,
  },
  {
    dataIndex: 'oracle_instrument_key',
    key: 'oracle_instrument_key',
    title: $t('page.research.basisAlerts.columns.oracleInstrument'),
  },
];

const basisAlertRows = computed(() =>
  basisAlerts.value.map((row) => ({
    as_of: formatDateTimeLocal(row.as_of),
    basis_bps: row.basis_bps,
    key: row.alert_id,
    oracle_instrument_key: row.oracle_instrument_key,
    threshold_bps: row.threshold_bps,
  })),
);

function basisExceedsThreshold(
  basisBps: string,
  thresholdBps: string,
): boolean {
  return Number(basisBps) > Number(thresholdBps);
}

async function loadHistory(marketId: string): Promise<void> {
  historyLoading.value = true;
  const rows = await handleRequest(() => getMarketLinkageHistory(marketId), {
    silent: true,
  });
  history.value = rows ?? [];
  historyLoading.value = false;
}

async function loadBasisAlerts(marketId: string): Promise<void> {
  basisAlertsLoading.value = true;
  const page = await handleRequest(
    () =>
      listBasisAlerts({
        market_id: marketId,
        page: 1,
        size: 10,
      }),
    { silent: true },
  );
  basisAlerts.value = page?.items ?? [];
  basisAlertTotal.value = page?.total ?? 0;
  basisAlertsLoading.value = false;
}

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (!isOpen) {
      detail.value = null;
      history.value = [];
      basisAlerts.value = [];
      basisAlertTotal.value = 0;
      return;
    }
    const data = drawerApi.getData<DrawerData>().detail;
    detail.value = data;
    void loadHistory(data.market_id);
    void loadBasisAlerts(data.market_id);
  },
});
</script>

<template>
  <Drawer
    :title="$t('page.research.marketLinkages.detail.title')"
    class="w-full max-w-4xl"
  >
    <div v-if="detail" class="flex flex-col gap-4">
      <Card
        size="small"
        :title="$t('page.research.marketLinkages.detail.provenance')"
      >
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem
            :label="$t('page.research.marketLinkages.detail.fields.marketId')"
          >
            <span class="break-all font-mono text-xs">{{
              detail.market_id
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.marketLinkages.detail.fields.status')"
          >
            <Tag :color="statusTag?.color">
              {{ statusTag?.label ?? detail.status }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.marketLinkages.detail.fields.tier')"
          >
            <Tag :color="tierTag?.color">
              {{ tierTag?.label ?? detail.resolver_tier }}
              (v{{ detail.resolver_version }})
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.marketLinkages.detail.fields.confidence')"
          >
            {{ detail.confidence }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.marketLinkages.detail.fields.instrument')"
          >
            <span class="break-all font-mono text-xs">
              {{
                detail.instrument_key ??
                $t('page.research.marketLinkages.emptyInstrument')
              }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t('page.research.marketLinkages.detail.fields.metadataHash')
            "
          >
            <span class="break-all font-mono text-xs">{{
              detail.metadata_hash
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t('page.research.marketLinkages.detail.fields.contentHash')
            "
          >
            <span class="break-all font-mono text-xs">{{
              detail.content_hash
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.marketLinkages.detail.fields.derivedAt')"
          >
            {{ formatDateTimeLocal(detail.derived_at) }}
          </DescriptionsItem>
        </Descriptions>
      </Card>

      <Card
        size="small"
        :title="$t('page.research.marketLinkages.detail.outcome')"
      >
        <template v-if="binding">
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.research.marketLinkages.detail.subject.asset')"
            >
              {{ binding.subject.asset }} / {{ binding.subject.quote }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.marketLinkages.detail.subject.comparator')
              "
            >
              {{ comparatorLabel }}
            </DescriptionsItem>
            <DescriptionsItem
              v-if="binding.subject.strike"
              :label="$t('page.research.marketLinkages.detail.subject.strike')"
            >
              {{ binding.subject.strike }}
            </DescriptionsItem>
            <DescriptionsItem
              v-if="binding.subject.reference_at"
              :label="
                $t('page.research.marketLinkages.detail.subject.referenceAt')
              "
            >
              {{ formatDateTimeLocal(binding.subject.reference_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.marketLinkages.detail.subject.observationAt')
              "
            >
              {{ formatDateTimeLocal(binding.subject.observation_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.marketLinkages.detail.subject.oracle')"
            >
              {{ oracleLabel }}
            </DescriptionsItem>
          </Descriptions>

          <div
            v-if="binding.override_context"
            class="mt-3 rounded-md border border-amber-300/60 bg-amber-50/40 p-3 text-xs dark:bg-amber-950/20"
          >
            <div class="font-medium">
              {{
                $t('page.research.marketLinkages.detail.overrideContext.title')
              }}
            </div>
            <div class="mt-1">
              {{
                $t('page.research.marketLinkages.detail.overrideContext.actor')
              }}: {{ binding.override_context.actor }}
            </div>
            <div class="mt-1">
              {{
                $t(
                  'page.research.marketLinkages.detail.overrideContext.reason',
                )
              }}: {{ binding.override_context.reason }}
            </div>
          </div>

          <div class="mt-3">
            <div class="mb-2 text-sm font-medium">
              {{ $t('page.research.marketLinkages.detail.grounding.title') }}
            </div>
            <Empty
              v-if="binding.grounding.spans.length === 0"
              :description="
                $t('page.research.marketLinkages.detail.grounding.empty')
              "
            />
            <Table
              v-else
              :columns="groundingColumns"
              :data-source="binding.grounding.spans"
              :pagination="false"
              row-key="subject_field"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'source'">
                  {{ $t(`enum.groundingSource.${record.source}`) }}
                </template>
                <template v-else-if="column.key === 'text'">
                  <span class="break-all font-mono text-xs">{{
                    record.text
                  }}</span>
                </template>
                <template v-else-if="column.key === 'kind'">
                  <Tag :color="groundingKindColor(record.kind)">
                    {{ $t(`enum.groundingKind.${record.kind}`) }}
                  </Tag>
                </template>
              </template>
            </Table>
          </div>
        </template>
        <template v-else-if="unresolvedReason">
          <Empty :description="unresolvedReason" />
        </template>
      </Card>

      <Card
        size="small"
        :loading="basisAlertsLoading"
        :title="$t('page.research.marketLinkages.detail.basisAlerts.title')"
      >
        <template #extra>
          <RouterLink v-if="detail" :to="basisAlertsPageLink">
            <Button size="small" type="link">
              {{
                $t('page.research.marketLinkages.detail.basisAlerts.viewAll', {
                  count: basisAlertTotal,
                })
              }}
            </Button>
          </RouterLink>
        </template>

        <Alert
          v-if="binding && !basisCheckApplicable"
          class="mb-3"
          show-icon
          type="info"
          :message="
            $t('page.research.marketLinkages.detail.basisAlerts.notApplicable')
          "
        />

        <Empty
          v-else-if="!basisAlertsLoading && basisAlertRows.length === 0"
          :description="
            $t('page.research.marketLinkages.detail.basisAlerts.empty')
          "
        />
        <Table
          v-else-if="basisAlertRows.length > 0"
          :columns="basisAlertColumns"
          :data-source="basisAlertRows"
          :pagination="false"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'basis_bps'">
              <span
                class="font-medium"
                :class="
                  basisExceedsThreshold(record.basis_bps, record.threshold_bps)
                    ? 'text-destructive'
                    : ''
                "
              >
                {{ record.basis_bps }}
              </span>
            </template>
            <template v-else-if="column.key === 'oracle_instrument_key'">
              <span class="break-all font-mono text-xs">{{
                record.oracle_instrument_key
              }}</span>
            </template>
          </template>
        </Table>
      </Card>

      <Card
        size="small"
        :loading="historyLoading"
        :title="$t('page.research.marketLinkages.detail.history.title')"
      >
        <Empty
          v-if="!historyLoading && historyRows.length === 0"
          :description="$t('page.research.marketLinkages.detail.history.empty')"
        />
        <Table
          v-else
          :columns="historyColumns"
          :data-source="historyRows"
          :pagination="false"
          size="small"
        />
      </Card>
    </div>
  </Drawer>
</template>
