<script lang="ts" setup>
import type { RecommendationAttributionView } from '@vben/types';

import { ref, watch } from 'vue';

import { normalizeApiError } from '@vben/request/qp';

import {
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  Spin,
  Tag,
} from 'antdv-next';

import { getRecommendationAttribution } from '#/api/quant-recommendations';
import { $t } from '#/locales';
import BulletList from '#/shared/components/bullet-list.vue';
import {
  EMPTY_PLACEHOLDER,
  formatBps,
  formatDateTimeLocal,
  formatPrice,
  formatShares,
  formatUsd,
} from '#/shared/components/format';
import {
  findTagOption,
  useRecommendationAttributionOutcomeTagOptions,
} from '#/shared/components/format/tag-options';

defineOptions({ name: 'RecommendationAttribution' });

const props = defineProps<{ active: boolean; recommendationId: string }>();

const attribution = ref<null | RecommendationAttributionView>(null);
const loading = ref(false);
let loaded = false;

const outcomeTagOptions = useRecommendationAttributionOutcomeTagOptions();

function boolLabel(value: boolean): string {
  return value ? $t('common.yes') : $t('common.no');
}

async function loadOnce() {
  if (loaded) {
    return;
  }
  loaded = true;
  loading.value = true;
  try {
    attribution.value = await getRecommendationAttribution(
      props.recommendationId,
    );
  } catch (error) {
    // Attribution is written post-trade (WORM). A 404 is the expected
    // "not labeled yet" state — render the read-only pending placeholder
    // rather than surfacing an error toast.
    const apiError = normalizeApiError(error);
    if (apiError.httpStatus === 404 || apiError.code === 404) {
      attribution.value = null;
    } else {
      loaded = false;
      throw error;
    }
  } finally {
    loading.value = false;
  }
}

// Attribution is lazy: fetch only when its tab is first opened.
watch(
  () => props.active,
  (active) => {
    if (active) {
      void loadOnce();
    }
  },
  { immediate: true },
);
</script>

<template>
  <Spin :spinning="loading">
    <div v-if="attribution" class="flex flex-col gap-4">
      <Descriptions :column="2" bordered size="small">
        <DescriptionsItem
          :label="$t('page.quantRecommendations.attribution.outcome')"
        >
          <Tag
            :color="
              findTagOption(outcomeTagOptions, attribution.outcome)?.color
            "
          >
            {{ findTagOption(outcomeTagOptions, attribution.outcome)?.label }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.attribution.realizedPnl')"
        >
          {{ formatUsd(attribution.realized_pnl_usd) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.attribution.mae')"
        >
          {{ formatBps(attribution.max_adverse_excursion_bps) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.attribution.mfe')"
        >
          {{ formatBps(attribution.max_favorable_excursion_bps) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.attribution.labelAvailableAt')"
        >
          {{ formatDateTimeLocal(attribution.label_available_at) }}
        </DescriptionsItem>
      </Descriptions>

      <Card
        size="small"
        :title="$t('page.quantRecommendations.attribution.entry.title')"
      >
        <Descriptions :column="2" bordered size="small">
          <DescriptionsItem
            :label="$t('page.quantRecommendations.attribution.entry.filled')"
          >
            {{ boolLabel(attribution.entry_outcome.entry_filled) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.attribution.entry.fillPrice')"
          >
            {{ formatPrice(attribution.entry_outcome.fill_price) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t('page.quantRecommendations.attribution.entry.fillShares')
            "
          >
            {{ formatShares(attribution.entry_outcome.fill_shares) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.attribution.entry.slippage')"
          >
            {{ formatBps(attribution.entry_outcome.entry_slippage_bps) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.attribution.entry.filledAt')"
          >
            {{ formatDateTimeLocal(attribution.entry_outcome.filled_at) }}
          </DescriptionsItem>
        </Descriptions>
      </Card>

      <Card
        size="small"
        :title="$t('page.quantRecommendations.attribution.exit.title')"
      >
        <Descriptions :column="2" bordered size="small">
          <DescriptionsItem
            :label="$t('page.quantRecommendations.attribution.exit.price')"
          >
            {{ formatPrice(attribution.exit_outcome.exit_price) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.attribution.exit.shares')"
          >
            {{ formatShares(attribution.exit_outcome.exit_shares) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.attribution.exit.trigger')"
          >
            {{
              attribution.exit_outcome.exit_trigger
                ? $t(
                    `enum.exitTriggerKind.${attribution.exit_outcome.exit_trigger}`,
                  )
                : EMPTY_PLACEHOLDER
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.attribution.exit.compliance')"
          >
            {{ boolLabel(attribution.exit_outcome.exit_compliance) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t('page.quantRecommendations.attribution.exit.settlementOutcome')
            "
          >
            {{
              attribution.exit_outcome.settlement_outcome
                ? $t(
                    `enum.recommendationOutcome.${attribution.exit_outcome.settlement_outcome}`,
                  )
                : EMPTY_PLACEHOLDER
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.attribution.exit.exitedAt')"
          >
            {{ formatDateTimeLocal(attribution.exit_outcome.exited_at) }}
          </DescriptionsItem>
        </Descriptions>
      </Card>

      <Card
        size="small"
        :title="$t('page.quantRecommendations.attribution.detail.title')"
      >
        <Descriptions :column="2" bordered size="small">
          <DescriptionsItem
            :label="
              $t('page.quantRecommendations.attribution.detail.hitStopLoss')
            "
          >
            {{ boolLabel(attribution.attribution.hit_stop_loss) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t('page.quantRecommendations.attribution.detail.hitTakeProfit')
            "
          >
            {{ boolLabel(attribution.attribution.hit_take_profit) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t(
                'page.quantRecommendations.attribution.detail.liquidityExitPossible',
              )
            "
          >
            {{ boolLabel(attribution.attribution.liquidity_exit_possible) }}
          </DescriptionsItem>
          <DescriptionsItem
            v-if="attribution.attribution.notes.length > 0"
            :label="$t('page.quantRecommendations.attribution.detail.notes')"
            :span="2"
          >
            <BulletList :items="attribution.attribution.notes" />
          </DescriptionsItem>
        </Descriptions>
      </Card>
    </div>
    <Empty
      v-else-if="!loading"
      :description="$t('page.quantRecommendations.attribution.empty')"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    >
      <p class="text-muted-foreground max-w-md text-xs">
        {{ $t('page.quantRecommendations.attribution.pending') }}
      </p>
    </Empty>
  </Spin>
</template>
