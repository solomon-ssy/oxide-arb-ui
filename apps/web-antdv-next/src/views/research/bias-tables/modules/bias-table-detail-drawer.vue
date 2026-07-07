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

import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';

defineOptions({ name: 'BiasTableDetailDrawer' });

interface DrawerData {
  detail: BiasTableDetailView;
}

const detail = ref<BiasTableDetailView | null>(null);

const categories = computed<[string, CategoryBiasCurveView][]>(() =>
  detail.value ? Object.entries(detail.value.by_category) : [],
);

const binColumns = computed(() => [
  {
    dataIndex: 'price_lo',
    title: $t('page.research.biasTables.detail.binColumns.priceLo'),
  },
  {
    dataIndex: 'price_hi',
    title: $t('page.research.biasTables.detail.binColumns.priceHi'),
  },
  {
    dataIndex: 'implied_mid',
    title: $t('page.research.biasTables.detail.binColumns.implied'),
  },
  {
    dataIndex: 'realized_frequency',
    title: $t('page.research.biasTables.detail.binColumns.realized'),
  },
  {
    dataIndex: 'bias',
    title: $t('page.research.biasTables.detail.binColumns.bias'),
  },
  {
    dataIndex: 'sample_count',
    title: $t('page.research.biasTables.detail.binColumns.samples'),
  },
]);

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    detail.value = isOpen ? drawerApi.getData<DrawerData>().detail : null;
  },
});
</script>

<template>
  <Drawer
    class="w-full max-w-4xl"
    :title="$t('page.research.biasTables.detail.title')"
  >
    <div v-if="detail" class="flex flex-col gap-4">
      <Card
        size="small"
        :title="$t('page.research.biasTables.detail.provenance')"
      >
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem
            :label="$t('page.research.biasTables.detail.fields.contentHash')"
          >
            <span class="break-all font-mono text-xs">
              {{ detail.content_hash }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.biasTables.detail.fields.fitWindow')"
          >
            {{ formatDateTimeLocal(detail.fit_window_start) }}
            {{ $t('page.research.biasTables.fitWindowSeparator') }}
            {{ formatDateTimeLocal(detail.fit_window_end) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t('page.research.biasTables.detail.fields.calibrationSplitHash')
            "
          >
            <span class="break-all font-mono text-xs">
              {{ detail.calibration_split_hash }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.biasTables.detail.fields.categoryCount')"
          >
            {{ detail.category_count }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.biasTables.detail.fields.sampleCount')"
          >
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
              {{
                curve.ic_significant
                  ? $t('page.research.biasTables.detail.icSignificant', {
                      ic: curve.ic,
                    })
                  : $t('page.research.biasTables.detail.icGatedOff', {
                      ic: curve.ic,
                    })
              }}
            </Tag>
            <span class="text-xs text-muted-foreground">
              {{
                $t('page.research.biasTables.detail.categorySamples', {
                  count: curve.sample_count,
                })
              }}
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
        :description="$t('page.research.biasTables.detail.emptyCategory')"
      />
    </div>
  </Drawer>
</template>
