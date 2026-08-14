<script lang="ts" setup>
import { computed } from 'vue';

import { Descriptions, DescriptionsItem, Empty } from 'antdv-next';

import { $t } from '#/locales';
import { formatBps, formatScore } from '#/shared/components/format';

import { parseExpectedVsRealized } from './backtest-expected-vs-realized';

defineOptions({ name: 'BacktestExpectedVsRealized' });

const props = defineProps<{
  value?: unknown;
}>();

const summary = computed(() => parseExpectedVsRealized(props.value));
</script>

<template>
  <Descriptions v-if="summary" :column="2" bordered size="small">
    <DescriptionsItem
      :label="
        $t(
          'page.research.backtests.detail.expectedVsRealizedPanel.meanExpected',
        )
      "
    >
      {{ formatBps(summary.meanExpectedBps) }}
    </DescriptionsItem>
    <DescriptionsItem
      :label="
        $t(
          'page.research.backtests.detail.expectedVsRealizedPanel.meanRealized',
        )
      "
    >
      {{ formatBps(summary.meanRealizedBps) }}
    </DescriptionsItem>
    <DescriptionsItem
      :label="
        $t('page.research.backtests.detail.expectedVsRealizedPanel.correlation')
      "
    >
      {{ formatScore(summary.correlation) }}
    </DescriptionsItem>
    <DescriptionsItem
      :label="$t('page.research.backtests.detail.expectedVsRealizedPanel.bias')"
    >
      {{ formatBps(summary.biasBps) }}
    </DescriptionsItem>
  </Descriptions>
  <Empty
    v-else
    :description="
      $t('page.research.backtests.detail.expectedVsRealizedPanel.empty')
    "
    :image="Empty.PRESENTED_IMAGE_SIMPLE"
  />
</template>
