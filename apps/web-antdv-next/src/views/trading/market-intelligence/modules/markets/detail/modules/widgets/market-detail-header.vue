<script lang="ts" setup>
import type { MarketView } from '@vben/types';

import { computed } from 'vue';

import { useClipboard } from '@vueuse/core';
import {
  message,
  RadioButton,
  RadioGroup,
  Switch,
  Tag,
  Tooltip,
} from 'antdv-next';

import { $t } from '#/locales';
import EnumTag from '#/shared/components/enum-tag.vue';
import {
  EMPTY_PLACEHOLDER,
  formatDurationSecs,
  truncateHexId,
} from '#/shared/components/format';

import { resolveMarketFreshnessState } from '../market-freshness';

defineOptions({ name: 'MarketDetailHeader' });

const props = defineProps<{
  bookAgeMs: null | number;
  canUpdate: boolean;
  fresh: boolean;
  live: boolean;
  market: MarketView;
  rangeOptions: ReadonlyArray<{ key: string; value: string }>;
}>();

const emit = defineEmits<{
  toggleSubscription: [next: boolean];
}>();

const range = defineModel<string>('range', { required: true });

const { copy } = useClipboard();
const freshnessState = computed(() =>
  resolveMarketFreshnessState({
    bookAgeMs: props.bookAgeMs,
    fresh: props.fresh,
  }),
);

const freshnessLabel = computed(() =>
  $t(`page.shared.marketFreshness.${freshnessState.value}`),
);

const bookAgeLabel = computed(() =>
  props.bookAgeMs === null
    ? EMPTY_PLACEHOLDER
    : formatDurationSecs(Math.round(props.bookAgeMs / 1000)),
);

function copyId(value: string) {
  void copy(value);
  message.success($t('page.markets.detail.copied'));
}
</script>

<template>
  <div class="bg-card flex flex-col gap-3 rounded-lg border p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex min-w-0 items-start gap-2">
        <div class="flex min-w-0 flex-col gap-1">
          <div class="flex flex-wrap items-center gap-2">
            <EnumTag
              context="market-detail.status"
              name="MarketStatus"
              :value="market.status"
            />
            <Tag v-if="live" color="success">
              {{ $t('page.markets.detail.liveWs') }}
            </Tag>
          </div>
          <div
            class="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"
          >
            <Tooltip :title="market.market_id">
              <span
                class="hover:text-foreground cursor-pointer font-mono"
                @click="copyId(market.market_id)"
              >
                {{ $t('page.markets.detail.marketId') }}:
                {{ truncateHexId(market.market_id) }}
              </span>
            </Tooltip>
            <span class="font-mono">
              {{ $t('page.markets.detail.eventId') }}: {{ market.event_id }}
            </span>
            <span class="flex items-center gap-1.5">
              <EnumTag
                :label="freshnessLabel"
                name="StalenessLevel"
                :value="freshnessState === 'unknown' ? null : freshnessState"
              />
              <span data-screenshot-volatile="true">
                {{ $t('page.markets.detail.bookAge') }}: {{ bookAgeLabel }}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div v-if="canUpdate" class="flex flex-wrap items-center gap-3">
        <span class="text-muted-foreground text-xs">
          {{ $t('page.markets.columns.subscribed') }}
        </span>
        <Switch
          :aria-label="$t('page.markets.columns.subscribed')"
          :checked="market.subscribed"
          size="small"
          @change="(checked: boolean) => emit('toggleSubscription', checked)"
        />
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div
        class="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs"
      >
        <EnumTag
          v-for="category in market.categories"
          :key="category"
          context="market-detail.category"
          name="MarketCategory"
          :value="category"
        />
      </div>
      <RadioGroup v-model:value="range" button-style="solid" size="small">
        <RadioButton
          v-for="option in rangeOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ $t(`page.markets.detail.range.${option.key}`) }}
        </RadioButton>
      </RadioGroup>
    </div>
  </div>
</template>
