<script lang="ts" setup>
import type { FactorBreakdownEntry } from '@vben/types';

import { Empty, Table, Tag, Tooltip } from 'antdv-next';

import { $t } from '#/locales';
import {
  EMPTY_PLACEHOLDER,
  formatPercent,
  formatScore,
} from '#/shared/components/format';
import {
  findTagOption,
  useFactorDirectionTagOptions,
} from '#/shared/components/format/tag-options';

defineOptions({ name: 'RecommendationFactors' });

defineProps<{ factors: FactorBreakdownEntry[] }>();

const directionTagOptions = useFactorDirectionTagOptions();

const columns = [
  {
    dataIndex: 'factor_name',
    key: 'factor_name',
    title: $t('page.quantRecommendations.factors.columns.name'),
  },
  {
    dataIndex: 'family',
    key: 'family',
    title: $t('page.quantRecommendations.factors.columns.family'),
    width: 150,
  },
  {
    dataIndex: 'direction',
    key: 'direction',
    title: $t('page.quantRecommendations.factors.columns.direction'),
    width: 110,
  },
  {
    align: 'right' as const,
    dataIndex: 'raw_value',
    key: 'raw_value',
    title: $t('page.quantRecommendations.factors.columns.raw'),
    width: 110,
  },
  {
    align: 'right' as const,
    dataIndex: 'normalized_score',
    key: 'normalized_score',
    title: $t('page.quantRecommendations.factors.columns.normalized'),
    width: 110,
  },
  {
    dataIndex: 'normalization_source',
    key: 'normalization_source',
    title: $t('page.quantRecommendations.factors.columns.source'),
    width: 150,
  },
  {
    align: 'right' as const,
    dataIndex: 'weight',
    key: 'weight',
    title: $t('page.quantRecommendations.factors.columns.weight'),
    width: 90,
  },
  {
    align: 'right' as const,
    dataIndex: 'contribution',
    key: 'contribution',
    title: $t('page.quantRecommendations.factors.columns.contribution'),
    width: 110,
  },
  {
    align: 'right' as const,
    dataIndex: 'confidence',
    key: 'confidence',
    title: $t('page.quantRecommendations.factors.columns.confidence'),
    width: 110,
  },
  {
    dataIndex: 'explanation',
    key: 'explanation',
    title: $t('page.quantRecommendations.factors.columns.explanation'),
  },
];
</script>

<template>
  <Empty
    v-if="factors.length === 0"
    :description="$t('page.quantRecommendations.factors.empty')"
    :image="Empty.PRESENTED_IMAGE_SIMPLE"
  />
  <Table
    v-else
    :columns="columns"
    :data-source="factors"
    :pagination="false"
    row-key="factor_name"
    size="small"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'family'">
        {{ $t(`enum.factorFamily.${record.family}`) }}
      </template>
      <template v-else-if="column.key === 'direction'">
        <Tag
          :color="findTagOption(directionTagOptions, record.direction)?.color"
        >
          {{ findTagOption(directionTagOptions, record.direction)?.label }}
        </Tag>
      </template>
      <template v-else-if="column.key === 'raw_value'">
        <span class="font-mono">{{
          record.raw_value ?? EMPTY_PLACEHOLDER
        }}</span>
      </template>
      <template v-else-if="column.key === 'normalized_score'">
        <span class="font-mono">{{
          record.normalized_score === null
            ? EMPTY_PLACEHOLDER
            : formatPercent(record.normalized_score)
        }}</span>
      </template>
      <template v-else-if="column.key === 'normalization_source'">
        <Tag v-if="record.normalization_source" color="blue">
          {{ $t(`enum.normalizationSource.${record.normalization_source}`) }}
        </Tag>
        <Tooltip
          v-else-if="record.indeterminate_reason"
          :title="$t('page.quantRecommendations.factors.indeterminateHint')"
        >
          <Tag color="warning">
            {{
              $t(
                `enum.factorIndeterminateReason.${record.indeterminate_reason}`,
              )
            }}
          </Tag>
        </Tooltip>
        <span v-else class="text-muted-foreground">{{
          EMPTY_PLACEHOLDER
        }}</span>
      </template>
      <template v-else-if="column.key === 'weight'">
        <span class="font-mono">{{ formatScore(record.weight) }}</span>
      </template>
      <template v-else-if="column.key === 'contribution'">
        <span class="font-mono">{{ formatScore(record.contribution) }}</span>
      </template>
      <template v-else-if="column.key === 'confidence'">
        <span class="font-mono">{{ formatPercent(record.confidence) }}</span>
      </template>
      <template v-else-if="column.key === 'explanation'">
        <Tooltip :title="record.explanation">
          <span class="line-clamp-2">{{
            record.explanation || EMPTY_PLACEHOLDER
          }}</span>
        </Tooltip>
      </template>
    </template>
  </Table>
</template>
