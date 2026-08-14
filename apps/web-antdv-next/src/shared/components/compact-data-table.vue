<script lang="ts" setup generic="Row extends Record<string, any>">
import type { TableColumnsType, TableColumnType } from 'antdv-next';

import { Empty, Table } from 'antdv-next';

defineOptions({ name: 'CompactDataTable' });

withDefaults(
  defineProps<{
    columns: TableColumnsType<Row>;
    dataSource: readonly Row[];
    emptyText?: string;
    loading?: boolean;
    rowKey?: ((record: Row) => string) | string;
    size?: 'middle' | 'small';
  }>(),
  { emptyText: undefined, loading: false, rowKey: 'key', size: 'small' },
);

defineSlots<{
  bodyCell?: (props: {
    column: TableColumnType<Row>;
    index: number;
    record: Row;
  }) => unknown;
}>();
</script>

<template>
  <Table
    :bordered="false"
    :columns="columns"
    :data-source="dataSource as Row[]"
    :loading="loading"
    :pagination="false"
    :row-key="rowKey"
    :show-header="false"
    :size="size"
  >
    <template #emptyText>
      <Empty :description="emptyText" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
    </template>
    <template #bodyCell="slotProps">
      <slot name="bodyCell" v-bind="slotProps"></slot>
    </template>
  </Table>
</template>
