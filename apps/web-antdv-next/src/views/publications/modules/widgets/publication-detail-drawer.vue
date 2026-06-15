<script lang="ts" setup>
import type {
  ControlFactorPublicationInfo,
  ShadowDecisionsResponse,
  UuidString,
} from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/oxide';

import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  DescriptionsItem,
  Row,
  Select,
  TabPane,
  Tabs,
} from 'antdv-next';
import dayjs from 'dayjs';

import { fetchShadowDecisions, getPublication } from '#/api/control-factors';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';

defineOptions({ name: 'PublicationDetailDrawer' });

const RangePicker = DatePicker.RangePicker;

const { handleRequest } = useRequestHandler();
const publication = ref<ControlFactorPublicationInfo | null>(null);
const decisions = ref<null | ShadowDecisionsResponse>(null);
const loading = ref(false);
const windowPreset = ref<'7d' | '24h' | 'custom'>('24h');
const customRange = ref<[string, string] | null>(null);
const limit = ref(200);

const isShadowMode = computed(() => publication.value?.mode === 'shadow');
const aggregate = computed(() => decisions.value?.aggregate);

const summaryCards = computed(() => {
  const agg = aggregate.value;
  if (!agg || agg.total === 0) {
    return [];
  }
  const pct = (count: number) => `${((count / agg.total) * 100).toFixed(1)}%`;
  return [
    {
      key: 'total',
      label: $t('page.publications.shadow.total'),
      value: agg.total,
    },
    {
      key: 'would_reject',
      label: $t('page.publications.shadow.wouldReject'),
      value: pct(agg.would_reject),
    },
    {
      key: 'would_size',
      label: $t('page.publications.shadow.wouldSize'),
      value: pct(agg.would_size),
    },
    {
      key: 'would_score',
      label: $t('page.publications.shadow.wouldScore'),
      value: pct(agg.would_score),
    },
    {
      key: 'no_effect',
      label: $t('page.publications.shadow.noEffect'),
      value: pct(agg.no_effect),
    },
    {
      key: 'distinct_markets',
      label: $t('page.publications.shadow.distinctMarkets'),
      value: agg.distinct_markets,
    },
  ];
});

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const { publicationId } = drawerApi.getData<{
        publicationId: UuidString;
      }>();
      void load(publicationId);
    } else {
      publication.value = null;
      decisions.value = null;
    }
  },
});

function windowParams() {
  const now = dayjs();
  if (windowPreset.value === '24h') {
    return {
      from: now.subtract(24, 'hour').toISOString(),
      to: now.toISOString(),
    };
  }
  if (windowPreset.value === '7d') {
    return {
      from: now.subtract(7, 'day').toISOString(),
      to: now.toISOString(),
    };
  }
  return {
    from: customRange.value?.[0] || undefined,
    to: customRange.value?.[1] || undefined,
  };
}

async function load(publicationId: UuidString) {
  loading.value = true;
  try {
    await handleRequest(
      () => getPublication(publicationId),
      (view) => {
        publication.value = view;
      },
    );
    if (publication.value?.mode === 'shadow') {
      await reloadDecisions(publicationId);
    }
  } finally {
    loading.value = false;
  }
}

async function reloadDecisions(publicationId: UuidString) {
  const params = windowParams();
  await handleRequest(
    () =>
      fetchShadowDecisions(publicationId, {
        from: params.from,
        limit: limit.value,
        to: params.to,
      }),
    (view) => {
      decisions.value = view;
    },
  );
}
</script>

<template>
  <Drawer
    :loading="loading"
    :title="$t('page.publications.detail.title')"
    class="w-full max-w-5xl"
  >
    <template v-if="publication">
      <Tabs>
        <TabPane key="base" :tab="$t('page.publications.detail.baseTab')">
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.publications.detail.publicationId')"
            >
              <span class="font-mono text-xs">{{
                publication.publication_id
              }}</span>
            </DescriptionsItem>
            <DescriptionsItem :label="$t('page.publications.detail.mode')">
              {{ $t(`enum.publicationMode.${publication.mode}`) }}
            </DescriptionsItem>
            <DescriptionsItem :label="$t('page.publications.detail.status')">
              {{ $t(`enum.publicationStatus.${publication.status}`) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.publications.detail.effectiveFrom')"
            >
              {{ formatDateTimeLocal(publication.effective_from) }}
            </DescriptionsItem>
            <DescriptionsItem :label="$t('page.publications.detail.expiresAt')">
              {{ formatDateTimeLocal(publication.expires_at) }}
            </DescriptionsItem>
            <DescriptionsItem :label="$t('page.publications.detail.reason')">
              {{ publication.approval_reason }}
            </DescriptionsItem>
          </Descriptions>
          <div class="bg-muted mt-4 max-h-48 overflow-auto rounded p-3 text-xs">
            <pre>{{ JSON.stringify(publication.factor_ids, null, 2) }}</pre>
          </div>
        </TabPane>
        <TabPane
          key="shadow"
          :disabled="!isShadowMode"
          :tab="$t('page.publications.detail.shadowTab')"
        >
          <div v-if="!isShadowMode" class="text-muted-foreground text-sm">
            {{ $t('page.publications.shadow.notShadowMode') }}
          </div>
          <template v-else>
            <div class="mb-4 flex flex-wrap items-center gap-2">
              <Select
                v-model:value="windowPreset"
                :options="[
                  { label: '24h', value: '24h' },
                  { label: '7d', value: '7d' },
                  {
                    label: $t('page.publications.shadow.custom'),
                    value: 'custom',
                  },
                ]"
                style="width: 140px"
              />
              <RangePicker
                v-if="windowPreset === 'custom'"
                v-model:value="customRange"
                show-time
                value-format="YYYY-MM-DDTHH:mm:ss[Z]"
              />
              <Button
                :loading="loading"
                @click="reloadDecisions(publication.publication_id)"
              >
                {{ $t('common.refresh') }}
              </Button>
            </div>
            <Row v-if="summaryCards.length > 0" :gutter="12" class="mb-4">
              <Col v-for="card in summaryCards" :key="card.key" :span="4">
                <Card size="small" :title="card.label">
                  <div class="text-lg font-semibold">{{ card.value }}</div>
                </Card>
              </Col>
            </Row>
            <div class="space-y-2">
              <div
                v-for="decision in decisions?.decisions ?? []"
                :key="decision.shadow_decision_id"
                :class="{
                  'border-amber-500/50 bg-amber-500/5':
                    JSON.stringify(decision.baseline_decision) !==
                    JSON.stringify(decision.shadow_decision),
                }"
                class="rounded border p-2 text-xs"
              >
                <div class="font-mono text-primary">
                  {{ decision.market_id }}
                </div>
                <div>
                  {{ $t(`enum.shadowDecisionType.${decision.decision_type}`) }}
                </div>
                <div class="mt-2 grid gap-2 md:grid-cols-3">
                  <pre class="bg-muted rounded p-2">{{
                    JSON.stringify(decision.baseline_decision, null, 2)
                  }}</pre>
                  <pre class="bg-muted rounded p-2">{{
                    JSON.stringify(decision.shadow_decision, null, 2)
                  }}</pre>
                  <pre class="bg-muted rounded p-2">{{
                    JSON.stringify(decision.delta, null, 2)
                  }}</pre>
                </div>
              </div>
            </div>
          </template>
        </TabPane>
      </Tabs>
    </template>
  </Drawer>
</template>
