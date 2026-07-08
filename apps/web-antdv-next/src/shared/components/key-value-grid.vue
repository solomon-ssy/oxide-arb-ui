<script lang="ts" setup>
import type { DescriptionsProps } from 'antdv-next';

import { Descriptions, DescriptionsItem } from 'antdv-next';

defineOptions({ name: 'KeyValueGrid' });

withDefaults(
  defineProps<{
    bordered?: boolean;
    column?: DescriptionsProps['column'];
    items: KeyValueGridItem[];
    size?: 'default' | 'middle' | 'small';
  }>(),
  { bordered: true, column: 2, size: 'small' },
);

export interface KeyValueGridItem {
  /** Unique key — also used as the named slot for custom content. */
  key: string;
  label: string;
  span?: number;
  /** Rendered as-is when no matching named slot is provided. */
  value?: string;
}
</script>

<template>
  <Descriptions :bordered="bordered" :column="column" :size="size">
    <DescriptionsItem
      v-for="item in items"
      :key="item.key"
      :label="item.label"
      :span="item.span"
    >
      <slot :item="item" :name="item.key">{{ item.value }}</slot>
    </DescriptionsItem>
  </Descriptions>
</template>
