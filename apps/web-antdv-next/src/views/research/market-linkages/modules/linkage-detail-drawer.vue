<script lang="ts" setup>
import type {
  BasisAlertView,
  GroundingSpanView,
  LinkageUnresolvedReasonView,
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
const cryptoSubject = computed(() =>
  binding.value?.subject.family === 'crypto' ? binding.value.subject : null,
);
const weatherSubject = computed(() =>
  binding.value?.subject.family === 'weather' ? binding.value.subject : null,
);
function formatUnresolvedReason(reason: LinkageUnresolvedReasonView): string {
  if (reason.code === 'no_deterministic_template') {
    return $t(`enum.linkageUnresolvedReason.${reason.code}`);
  }
  const field =
    'subject_field' in reason.failure
      ? ` · ${reason.failure.subject_field}`
      : '';
  return `${$t(`enum.linkageUnresolvedReason.${reason.code}`)} · ${$t(
    `enum.resolverTier.${reason.tier}`,
  )} · ${$t(`enum.linkageValidationFailure.${reason.failure.code}`)}${field}`;
}

const unresolvedReason = computed(() =>
  outcome.value?.status === 'unresolved'
    ? formatUnresolvedReason(outcome.value.reason)
    : null,
);

const comparatorLabel = computed(() => {
  const comparator = cryptoSubject.value?.comparator;
  if (!comparator) {
    return '';
  }
  return comparator.kind === 'between'
    ? `${$t(`enum.priceComparator.${comparator.kind}`)} (${comparator.hi})`
    : $t(`enum.priceComparator.${comparator.kind}`);
});

const oracleLabel = computed(() => {
  const oracle = cryptoSubject.value?.resolution_oracle;
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
    default: {
      return '';
    }
  }
});

/** Basis cross-check applies only when settlement oracle is Chainlink. */
const basisCheckApplicable = computed(
  () =>
    cryptoSubject.value?.resolution_oracle.kind === 'chainlink_data_streams',
);

const weatherBandLabel = computed(() => {
  const subject = weatherSubject.value;
  if (!subject) {
    return '';
  }
  const lower = subject.outcome_band.lower_inclusive;
  const upper = subject.outcome_band.upper_inclusive;
  const unit = $t(`enum.temperatureUnit.${subject.market_unit}`);
  if (lower !== null && upper !== null) {
    return `${lower}–${upper} ${unit}`;
  }
  if (lower !== null) {
    return `≥ ${lower} ${unit}`;
  }
  return `≤ ${upper} ${unit}`;
});

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

const sourceBindingColumns = [
  {
    dataIndex: 'role',
    key: 'role',
    title: $t('page.research.marketLinkages.detail.sources.role'),
  },
  {
    dataIndex: 'source_id',
    key: 'source_id',
    title: $t('page.research.marketLinkages.detail.sources.source'),
  },
  {
    dataIndex: 'instrument_key',
    key: 'instrument_key',
    title: $t('page.research.marketLinkages.detail.sources.instrument'),
  },
  {
    dataIndex: 'available_at',
    key: 'available_at',
    title: $t('page.research.marketLinkages.detail.sources.availableAt'),
  },
  {
    dataIndex: 'binding_hash',
    key: 'binding_hash',
    title: $t('page.research.marketLinkages.detail.sources.bindingHash'),
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
    actor: row.override_actor ?? '—',
    derived_at: formatDateTimeLocal(row.derived_at),
    key: row.linkage_id,
    reason:
      row.override_reason ??
      (row.outcome.status === 'unresolved'
        ? formatUnresolvedReason(row.outcome.reason)
        : '—'),
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
  {
    dataIndex: 'acknowledged',
    key: 'acknowledged',
    title: $t('page.research.basisAlerts.columns.acknowledged'),
    width: 120,
  },
];

const basisAlertRows = computed(() =>
  basisAlerts.value.map((row) => ({
    acknowledged: row.acknowledged,
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
    if (
      data.outcome.status === 'resolved' &&
      data.outcome.subject.family === 'crypto'
    ) {
      void loadBasisAlerts(data.market_id);
    }
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
            :label="$t('page.research.marketLinkages.detail.fields.family')"
          >
            {{ $t(`enum.domainFamily.${detail.domain_family}`) }}
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
        :title="$t('page.research.marketLinkages.detail.sources.title')"
      >
        <Empty
          v-if="detail.source_bindings.length === 0"
          :description="$t('page.research.marketLinkages.emptySourceBindings')"
        />
        <Table
          v-else
          :columns="sourceBindingColumns"
          :data-source="detail.source_bindings"
          :pagination="false"
          :scroll="{ x: 920 }"
          row-key="binding_hash"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'role'">
              <Tag>{{ $t(`enum.linkageSourceRole.${record.role}`) }}</Tag>
            </template>
            <template
              v-else-if="
                column.key === 'instrument_key' || column.key === 'binding_hash'
              "
            >
              <span class="break-all font-mono text-xs">
                {{ record[column.key] }}
              </span>
            </template>
            <template v-else-if="column.key === 'available_at'">
              {{ formatDateTimeLocal(record.available_at) }}
            </template>
          </template>
        </Table>
      </Card>

      <Card
        size="small"
        :title="$t('page.research.marketLinkages.detail.outcome')"
      >
        <template v-if="binding">
          <Descriptions v-if="cryptoSubject" :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.research.marketLinkages.detail.subject.asset')"
            >
              {{ cryptoSubject.asset }} / {{ cryptoSubject.quote }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.marketLinkages.detail.subject.comparator')
              "
            >
              {{ comparatorLabel }}
            </DescriptionsItem>
            <DescriptionsItem
              v-if="cryptoSubject.strike"
              :label="$t('page.research.marketLinkages.detail.subject.strike')"
            >
              {{ cryptoSubject.strike }}
            </DescriptionsItem>
            <DescriptionsItem
              v-if="cryptoSubject.reference_at"
              :label="
                $t('page.research.marketLinkages.detail.subject.referenceAt')
              "
            >
              {{ formatDateTimeLocal(cryptoSubject.reference_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.marketLinkages.detail.subject.observationAt')
              "
            >
              {{ formatDateTimeLocal(cryptoSubject.observation_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.marketLinkages.detail.subject.oracle')"
            >
              {{ oracleLabel }}
            </DescriptionsItem>
          </Descriptions>

          <Descriptions
            v-else-if="weatherSubject"
            :column="1"
            bordered
            size="small"
          >
            <DescriptionsItem
              :label="$t('page.research.marketLinkages.detail.subject.station')"
            >
              <span class="font-mono">{{ weatherSubject.station }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.marketLinkages.detail.subject.timezone')
              "
            >
              {{ weatherSubject.timezone }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.marketLinkages.detail.subject.localDate')
              "
            >
              {{ weatherSubject.local_date }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.marketLinkages.detail.subject.outcomeBand')
              "
            >
              {{ weatherBandLabel }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.marketLinkages.detail.subject.settlementRule')
              "
            >
              <a
                :href="weatherSubject.settlement_rule_url"
                rel="noopener noreferrer"
                target="_blank"
              >
                {{ weatherSubject.settlement_rule_url }}
              </a>
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t(
                  'page.research.marketLinkages.detail.subject.stationProfileHash',
                )
              "
            >
              <span class="break-all font-mono text-xs">
                {{ weatherSubject.station_profile_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t(
                  'page.research.marketLinkages.detail.subject.proxyMethodologyHash',
                )
              "
            >
              <span class="break-all font-mono text-xs">
                {{ weatherSubject.proxy_methodology_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.marketLinkages.detail.subject.proxyCaveat')
              "
            >
              {{
                $t('page.research.marketLinkages.detail.subject.noaaProxyOnly')
              }}
            </DescriptionsItem>
          </Descriptions>

          <Alert
            v-if="binding.override_context"
            class="mt-3"
            show-icon
            type="warning"
          >
            <template #message>
              {{
                $t('page.research.marketLinkages.detail.overrideContext.title')
              }}
            </template>
            <template #description>
              <div>
                {{
                  $t(
                    'page.research.marketLinkages.detail.overrideContext.actor',
                  )
                }}: {{ binding.override_context.actor }}
              </div>
              <div class="mt-1">
                {{
                  $t(
                    'page.research.marketLinkages.detail.overrideContext.reason',
                  )
                }}: {{ binding.override_context.reason }}
              </div>
            </template>
          </Alert>

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
        v-if="cryptoSubject"
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
            <template v-else-if="column.key === 'acknowledged'">
              <Tag :color="record.acknowledged ? 'success' : 'warning'">
                {{
                  record.acknowledged
                    ? $t('page.research.basisAlerts.acknowledged.yes')
                    : $t('page.research.basisAlerts.acknowledged.no')
                }}
              </Tag>
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
