<script lang="ts" setup>
import type { QuantRecommendationView } from '@vben/types';

import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import { Button, Empty, Table, Tag, Tooltip } from 'antdv-next';

import { $t } from '#/locales';
import {
  formatBps,
  formatPercent,
  formatScore,
  formatUsd,
} from '#/shared/components/format';
import {
  findTagOption,
  useOutcomeSideTagOptions,
  useRecommendationStatusTagOptions,
} from '#/shared/components/format/tag-options';

defineOptions({ name: 'ReportRecommendationsTable' });

defineProps<{ recommendations: QuantRecommendationView[] }>();

const emit = defineEmits<{
  select: [recommendation: QuantRecommendationView];
}>();

const router = useRouter();

function openFullPage(id: string) {
  void router.push(`/quant/recommendations/${id}`);
}

function rowProps(record: QuantRecommendationView) {
  return {
    class: 'cursor-pointer',
    role: 'button',
    tabindex: 0,
    onClick: () => emit('select', record),
    onKeydown: (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        emit('select', record);
      }
    },
  };
}

const sideTagOptions = useOutcomeSideTagOptions();
const statusTagOptions = useRecommendationStatusTagOptions();

const columns = [
  {
    align: 'right' as const,
    dataIndex: 'rank',
    key: 'rank',
    title: $t('page.quantReports.detail.recommendations.columns.rank'),
    width: 80,
  },
  {
    dataIndex: ['identity', 'question'],
    key: 'market',
    title: $t('page.quantReports.detail.recommendations.columns.market'),
  },
  {
    dataIndex: 'outcome_side',
    key: 'outcome_side',
    title: $t('page.quantReports.detail.recommendations.columns.side'),
    width: 90,
  },
  {
    align: 'right' as const,
    dataIndex: 'composite_score',
    key: 'composite_score',
    title: $t('page.quantReports.detail.recommendations.columns.composite'),
    width: 110,
  },
  {
    align: 'right' as const,
    dataIndex: 'risk_adjusted_score',
    key: 'risk_adjusted_score',
    title: $t('page.quantReports.detail.recommendations.columns.riskAdjusted'),
    width: 110,
  },
  {
    align: 'right' as const,
    dataIndex: 'confidence',
    key: 'confidence',
    title: $t('page.quantReports.detail.recommendations.columns.confidence'),
    width: 110,
  },
  {
    align: 'right' as const,
    dataIndex: 'expected_return_bps',
    key: 'expected_return_bps',
    title: $t(
      'page.quantReports.detail.recommendations.columns.expectedReturn',
    ),
    width: 120,
  },
  {
    align: 'right' as const,
    key: 'suggested',
    title: $t('page.quantReports.detail.recommendations.columns.suggested'),
    width: 120,
  },
  {
    key: 'eligibility',
    title: $t('page.quantReports.detail.recommendations.columns.eligibility'),
    width: 150,
  },
  {
    dataIndex: 'status',
    key: 'status',
    title: $t('page.quantReports.detail.recommendations.columns.status'),
    width: 130,
  },
  {
    align: 'right' as const,
    fixed: 'right' as const,
    key: 'open',
    title: $t('page.quantReports.detail.recommendations.columns.open'),
    width: 72,
  },
];
</script>

<template>
  <Empty
    v-if="recommendations.length === 0"
    :description="$t('page.quantReports.detail.recommendations.empty')"
    :image="Empty.PRESENTED_IMAGE_SIMPLE"
  />
  <Table
    v-else
    :columns="columns"
    :custom-row="rowProps"
    :data-source="recommendations"
    :pagination="false"
    row-key="recommendation_id"
    size="small"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'outcome_side'">
        <Tag :color="findTagOption(sideTagOptions, record.outcome_side)?.color">
          {{ findTagOption(sideTagOptions, record.outcome_side)?.label }}
        </Tag>
      </template>
      <template v-else-if="column.key === 'composite_score'">
        <span class="font-mono">{{ formatScore(record.composite_score) }}</span>
      </template>
      <template v-else-if="column.key === 'risk_adjusted_score'">
        <span class="font-mono">{{
          formatScore(record.risk_adjusted_score)
        }}</span>
      </template>
      <template v-else-if="column.key === 'confidence'">
        <span class="font-mono">{{ formatPercent(record.confidence) }}</span>
      </template>
      <template v-else-if="column.key === 'expected_return_bps'">
        <span class="font-mono">{{
          formatBps(record.expected_return_bps)
        }}</span>
      </template>
      <template v-else-if="column.key === 'suggested'">
        <span class="font-mono">{{
          formatUsd(record.sizing_plan.suggested_usd)
        }}</span>
      </template>
      <template v-else-if="column.key === 'eligibility'">
        <Tag
          v-for="mode in record.execution_eligibility.eligible_modes"
          :key="mode"
        >
          {{ $t(`enum.quantRuntimeMode.${mode}`) }}
        </Tag>
      </template>
      <template v-else-if="column.key === 'status'">
        <Tag :color="findTagOption(statusTagOptions, record.status)?.color">
          {{ findTagOption(statusTagOptions, record.status)?.label }}
        </Tag>
      </template>
      <template v-else-if="column.key === 'open'">
        <Tooltip
          :title="$t('page.quantReports.detail.recommendations.columns.open')"
        >
          <Button
            size="small"
            type="link"
            @click.stop="openFullPage(record.recommendation_id)"
          >
            <IconifyIcon class="size-5" icon="lucide:external-link" />
          </Button>
        </Tooltip>
      </template>
    </template>
  </Table>
</template>
