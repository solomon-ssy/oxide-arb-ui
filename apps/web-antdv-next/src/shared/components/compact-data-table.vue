<script lang="ts" setup generic="Row extends Record<string, any>">
import type { TableColumnsType, TableColumnType } from 'antdv-next';

import { computed } from 'vue';

import { Empty, Table } from 'antdv-next';

import { centerTableColumns } from '#/shared/table/center-columns';

defineOptions({ name: 'CompactDataTable' });

const props = withDefaults(
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

const centeredColumns = computed(
  () => centerTableColumns(props.columns) ?? props.columns,
);
</script>

<template>
  <Table
    :bordered="false"
    :columns="centeredColumns"
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
