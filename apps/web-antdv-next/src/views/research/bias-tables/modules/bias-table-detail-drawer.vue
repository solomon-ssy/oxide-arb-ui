<script lang="ts" setup>
import type { BiasTableDetailView, CategoryBiasCurveView } from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  Table,
  Tag,
} from 'antdv-next';

import { formatDateTimeLocal } from '#/shared/components/format';

defineOptions({ name: 'BiasTableDetailDrawer' });

interface DrawerData {
  detail: BiasTableDetailView;
}

const detail = ref<BiasTableDetailView | null>(null);

const categories = computed<[string, CategoryBiasCurveView][]>(() =>
  detail.value ? Object.entries(detail.value.by_category) : [],
);

const binColumns = [
  { dataIndex: 'price_lo', title: 'Price ≥' },
  { dataIndex: 'price_hi', title: 'Price <' },
  { dataIndex: 'implied_mid', title: 'Implied' },
  { dataIndex: 'realized_frequency', title: 'Realized' },
  { dataIndex: 'bias', title: 'Bias' },
  { dataIndex: 'sample_count', title: 'Samples' },
];

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    detail.value = isOpen ? drawerApi.getData<DrawerData>().detail : null;
  },
});
</script>

<template>
  <Drawer title="Bias table" class="w-full max-w-4xl">
    <div v-if="detail" class="flex flex-col gap-4">
      <Card size="small" title="Provenance">
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem label="Content hash">
            <span class="font-mono text-xs break-all">
              {{ detail.content_hash }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem label="Fit window">
            {{ formatDateTimeLocal(detail.fit_window_start) }} →
            {{ formatDateTimeLocal(detail.fit_window_end) }}
          </DescriptionsItem>
          <DescriptionsItem label="Calibration split hash">
            <span class="font-mono text-xs break-all">
              {{ detail.calibration_split_hash }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem label="Categories">
            {{ detail.category_count }}
          </DescriptionsItem>
          <DescriptionsItem label="Samples">
            {{ detail.total_sample_count }}
          </DescriptionsItem>
        </Descriptions>
      </Card>

      <Card
        v-for="[category, curve] in categories"
        :key="category"
        size="small"
      >
        <template #title>
          <div class="flex items-center gap-2">
            <span>{{ category }}</span>
            <Tag :color="curve.ic_significant ? 'success' : 'default'">
              IC {{ curve.ic }}
              {{ curve.ic_significant ? '(significant)' : '(gated off)' }}
            </Tag>
            <span class="text-muted-foreground text-xs">
              {{ curve.sample_count }} samples
            </span>
          </div>
        </template>
        <Table
          :columns="binColumns"
          :data-source="curve.bins"
          :pagination="false"
          row-key="price_lo"
          size="small"
        />
      </Card>

      <Empty
        v-if="categories.length === 0"
        description="No qualifying category"
      />
    </div>
  </Drawer>
</template>
