<script lang="ts" setup>
import type { BacktestPathSetView } from '@vben/types';

import { computed } from 'vue';

import {
  Alert,
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  Table,
  TypographyText,
} from 'antdv-next';

import { $t } from '#/locales';
import { formatDateTimeLocal, formatScore } from '#/shared/components/format';

import SharpeDistributionChart from './sharpe-distribution-chart.vue';

defineOptions({ name: 'CpcvValidationPanel' });

const props = defineProps<{
  pathSet?: BacktestPathSetView | null;
}>();

const paths = computed(() => {
  const rows = props.pathSet?.paths;
  return Array.isArray(rows) ? rows : [];
});

const pathColumns = computed(() => [
  { title: '#', dataIndex: 'path_index', key: 'path_index', width: 56 },
  { title: 'Sharpe', dataIndex: 'sharpe', key: 'sharpe' },
  { title: 'Rank IC', dataIndex: 'rank_ic', key: 'rank_ic' },
  { title: 'Max DD', dataIndex: 'max_drawdown', key: 'max_drawdown' },
  { title: 'Tail loss', dataIndex: 'tail_loss', key: 'tail_loss' },
]);
</script>

<template>
  <Empty
    v-if="!pathSet"
    :description="$t('page.research.cpcv.empty')"
    :image="Empty.PRESENTED_IMAGE_SIMPLE"
  />
  <div v-else class="flex flex-col gap-4">
    <Alert
      :message="$t('page.research.cpcv.sharpeUnannualized')"
      show-icon
      type="info"
    />
    <Descriptions bordered :column="2" size="small">
      <DescriptionsItem :label="$t('page.research.cpcv.pathSetId')">
        <TypographyText code copyable>
          {{ pathSet.path_set_id }}
        </TypographyText>
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.cpcv.createdAt')">
        {{ formatDateTimeLocal(pathSet.created_at) }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.cpcv.pathCount')">
        {{ pathSet.path_count }} / {{ pathSet.combination_count }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.cpcv.medianRankIc')">
        {{ formatScore(pathSet.median_rank_ic) }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.cpcv.deflatedSharpe')">
        {{ formatScore(pathSet.deflated_sharpe) }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.cpcv.pbo')">
        {{ formatScore(pathSet.pbo) }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.cpcv.minTrl')">
        {{
          pathSet.min_track_record_length_secs ??
          $t('page.research.cpcv.minTrlUnavailable')
        }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.cpcv.trialCount')">
        {{ pathSet.trial_count }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.cpcv.trialGridCount')">
        {{ pathSet.trial_grid_count }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.cpcv.coordSearchEffectiveN')">
        {{ pathSet.coord_search_effective_n }}
      </DescriptionsItem>
    </Descriptions>

    <Card size="small" :title="$t('page.research.cpcv.sharpeDistribution')">
      <SharpeDistributionChart :distribution="pathSet.sharpe_distribution" />
    </Card>

    <Card size="small" :title="$t('page.research.cpcv.paths')">
      <Table
        :columns="pathColumns"
        :data-source="paths"
        :pagination="false"
        row-key="path_index"
        size="small"
      />
    </Card>
  </div>
</template>
