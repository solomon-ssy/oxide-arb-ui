<script lang="ts" setup>
import type { ExitMonitorObservationView } from '@vben/types';

import { Card, Descriptions, DescriptionsItem, Tag } from 'antdv-next';

import { $t } from '#/locales';
import {
  EMPTY_PLACEHOLDER,
  formatBps,
  formatDateTimeLocal,
  formatPercent,
  formatPrice,
  formatScore,
  formatShares,
} from '#/shared/components/format';

defineOptions({ name: 'ExitMonitorCard' });

defineProps<{
  observation: ExitMonitorObservationView;
}>();
</script>

<template>
  <Card
    data-testid="exit-monitor-card"
    size="small"
    :title="$t('page.quantIntents.exitMonitor.title')"
  >
    <Descriptions :column="1" bordered size="small">
      <DescriptionsItem :label="$t('page.quantIntents.exitMonitor.state')">
        <Tag>{{ $t(`enum.exitState.${observation.state}`) }}</Tag>
        <span v-if="observation.reason" class="text-muted-foreground ml-2">
          {{ $t(`enum.exitReason.${observation.reason}`) }}
        </span>
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.quantIntents.exitMonitor.book')">
        <Tag :color="observation.book_fresh ? 'success' : 'error'">
          {{
            observation.book_fresh
              ? $t('page.quantIntents.detail.entry.fresh')
              : $t('page.quantIntents.detail.entry.stale')
          }}
        </Tag>
        <span class="ml-2 font-mono">
          {{ formatPrice(observation.current_executable_bid) }}
        </span>
        <span
          class="text-muted-foreground ml-2 inline-block w-[14rem] max-w-full text-xs"
          data-screenshot-volatile="true"
        >
          {{ observation.book_age_ms ?? EMPTY_PLACEHOLDER }} ms ·
          {{ formatDateTimeLocal(observation.book_observed_at) }}
        </span>
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.quantIntents.exitMonitor.trailing')">
        <span class="font-mono">
          {{ formatPrice(observation.peak_mark) }} →
          {{ formatPrice(observation.effective_stop) }}
        </span>
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.quantIntents.exitMonitor.nextTarget')">
        <template v-if="observation.next_scale_out">
          <span class="font-mono">
            {{ observation.next_scale_out.target_id }} ·
            {{ formatPrice(observation.next_scale_out.trigger_price) }} ·
            {{
              formatPercent(
                observation.next_scale_out.target_cumulative_exit_pct,
              )
            }}
            · {{ formatShares(observation.next_scale_out.delta_shares) }}
          </span>
        </template>
        <template v-else>{{ EMPTY_PLACEHOLDER }}</template>
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.quantIntents.exitMonitor.exited')">
        <span class="font-mono">
          {{ formatShares(observation.cumulative_exited_shares) }} ·
          {{ formatPercent(observation.cumulative_exit_pct) }}
        </span>
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.quantIntents.exitMonitor.reinference')"
      >
        <template v-if="observation.latest_reinference">
          <div class="flex flex-col gap-1">
            <span>
              {{
                $t(
                  `page.quantIntents.exitMonitor.verdict.${observation.latest_reinference.verdict}`,
                )
              }}
              · {{ formatScore(observation.latest_reinference.score) }} ·
              {{
                formatPercent(observation.latest_reinference.score_retention)
              }}
              ·
              {{
                formatBps(observation.latest_reinference.expected_return_bps)
              }}
            </span>
            <span
              class="text-muted-foreground text-xs"
              data-screenshot-volatile="true"
            >
              {{
                formatDateTimeLocal(observation.latest_reinference.observed_at)
              }}
              · {{ observation.latest_reinference.detail }}
            </span>
          </div>
        </template>
        <template v-else>{{ EMPTY_PLACEHOLDER }}</template>
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.quantIntents.exitMonitor.cadence')">
        <span data-screenshot-volatile="true">
          {{ formatDateTimeLocal(observation.last_check_at) }} →
          {{ formatDateTimeLocal(observation.next_check_at) }}
        </span>
      </DescriptionsItem>
    </Descriptions>
  </Card>
</template>
