<script lang="ts" setup>
import { computed } from 'vue';

import {
  Collapse,
  CollapsePanel,
  Descriptions,
  DescriptionsItem,
  Empty,
  Table,
} from 'antdv-next';
import { Mode } from 'vanilla-jsoneditor';

import { $t } from '#/locales';
import { formatBps, formatScore } from '#/shared/components/format';
import JsonEditorShell from '#/shared/components/json-editor/json-editor-shell.vue';

import { parseExpectedVsRealized } from './backtest-expected-vs-realized';

defineOptions({ name: 'BacktestExpectedVsRealized' });

const props = defineProps<{
  value?: unknown;
}>();

const parsed = computed(() => parseExpectedVsRealized(props.value));

const bucketColumns = [
  {
    dataIndex: 'decile',
    key: 'decile',
    title: $t('page.research.backtests.detail.expectedVsRealizedPanel.decile'),
    width: 72,
  },
  {
    dataIndex: 'expectedReturnBps',
    key: 'expectedReturnBps',
    title: $t(
      'page.research.backtests.detail.expectedVsRealizedPanel.expectedBps',
    ),
  },
  {
    dataIndex: 'realizedReturnBps',
    key: 'realizedReturnBps',
    title: $t(
      'page.research.backtests.detail.expectedVsRealizedPanel.realizedBps',
    ),
  },
  {
    align: 'right' as const,
    dataIndex: 'samples',
    key: 'samples',
    title: $t('page.research.backtests.detail.expectedVsRealizedPanel.samples'),
  },
];
</script>

<template>
  <div class="flex flex-col gap-3">
    <Descriptions v-if="parsed.summary" :column="2" bordered size="small">
      <DescriptionsItem
        :label="
          $t(
            'page.research.backtests.detail.expectedVsRealizedPanel.meanExpected',
          )
        "
      >
        {{ formatBps(parsed.summary.meanExpectedBps) }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="
          $t(
            'page.research.backtests.detail.expectedVsRealizedPanel.meanRealized',
          )
        "
      >
        {{ formatBps(parsed.summary.meanRealizedBps) }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="
          $t(
            'page.research.backtests.detail.expectedVsRealizedPanel.correlation',
          )
        "
      >
        {{ formatScore(parsed.summary.correlation) }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="
          $t('page.research.backtests.detail.expectedVsRealizedPanel.bias')
        "
      >
        {{ formatBps(parsed.summary.biasBps) }}
      </DescriptionsItem>
    </Descriptions>

    <Table
      v-if="parsed.buckets.length > 0"
      :columns="bucketColumns"
      :data-source="parsed.buckets"
      :pagination="false"
      row-key="decile"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'expectedReturnBps'">
          {{ formatBps(record.expectedReturnBps) }}
        </template>
        <template v-else-if="column.key === 'realizedReturnBps'">
          {{ formatBps(record.realizedReturnBps) }}
        </template>
      </template>
    </Table>

    <Empty
      v-if="!parsed.hasStructuredContent"
      :description="
        $t('page.research.backtests.detail.expectedVsRealizedPanel.empty')
      "
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />

    <Collapse v-if="value && typeof value === 'object'" ghost>
      <CollapsePanel
        key="raw"
        :header="
          $t('page.research.backtests.detail.expectedVsRealizedPanel.raw')
        "
      >
        <JsonEditorShell :model-value="value" :mode="Mode.tree" read-only />
      </CollapsePanel>
    </Collapse>
  </div>
</template>
