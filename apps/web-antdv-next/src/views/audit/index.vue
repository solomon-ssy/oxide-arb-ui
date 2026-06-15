<script lang="ts" setup>
import type { ControlFactorAuditEventInfo } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/oxide';

import { Alert, Button } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { fetchAuditChain, getAuditEvent } from '#/api/control-factors';
import { $t } from '#/locales';

import { useAuditChainColumns } from './modules/schemas';
import AuditEventDetailDrawer from './modules/widgets/audit-event-detail-drawer.vue';

defineOptions({ name: 'AuditChainPage' });

const route = useRoute();
const { handleRequest } = useRequestHandler();
const rows = ref<ControlFactorAuditEventInfo[]>([]);
const verified = ref(true);
const brokenAt = ref<null | number>(null);
const loading = ref(false);
const highlightSequence = ref<null | number>(null);
const limit = 100;
const nextSequence = computed(() =>
  rows.value.length === 0
    ? 1
    : Math.max(...rows.value.map((row) => row.sequence)) + 1,
);

const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: AuditEventDetailDrawer,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid<ControlFactorAuditEventInfo>({
  gridOptions: {
    columns: useAuditChainColumns(onActionClick),
    data: rows.value,
    rowClassName: ({ row }: { row: ControlFactorAuditEventInfo }) =>
      highlightSequence.value === row.sequence ? 'bg-primary/10' : '',
    rowConfig: { keyField: 'event_id' },
    toolbarConfig: { refresh: false },
  },
});

function syncGrid() {
  gridApi.setGridOptions({ data: rows.value });
}

async function loadMore(params?: { eventId?: string; fromSequence?: number }) {
  loading.value = true;
  try {
    await handleRequest(
      () =>
        fetchAuditChain({
          event_id: params?.eventId,
          from_sequence: params?.fromSequence,
          limit,
        }),
      (response) => {
        const seen = new Set(rows.value.map((row) => row.sequence));
        rows.value.push(
          ...response.events.filter((event) => !seen.has(event.sequence)),
        );
        verified.value = response.verified;
        brokenAt.value = response.broken_at;
        syncGrid();
      },
    );
  } finally {
    loading.value = false;
  }
}

async function scrollToHighlightedRow(target: ControlFactorAuditEventInfo) {
  await nextTick();
  gridApi.grid?.scrollToRow(target);
}

async function locateFromQuery() {
  const eventId = route.query.event_id as string | undefined;
  const sequence = route.query.sequence
    ? Number(route.query.sequence)
    : undefined;
  if (
    !eventId &&
    (sequence === null || sequence === undefined || Number.isNaN(sequence))
  ) {
    return;
  }
  const targetSequence = sequence;
  while (
    targetSequence !== null &&
    targetSequence !== undefined &&
    !Number.isNaN(targetSequence) &&
    !rows.value.some((row) => row.sequence === targetSequence)
  ) {
    const before = rows.value.length;
    await loadMore({ fromSequence: nextSequence.value });
    if (rows.value.length === before) {
      break;
    }
  }
  let target: ControlFactorAuditEventInfo | undefined;
  if (
    targetSequence !== null &&
    targetSequence !== undefined &&
    !Number.isNaN(targetSequence)
  ) {
    highlightSequence.value = targetSequence;
    target = rows.value.find((row) => row.sequence === targetSequence);
  } else if (eventId) {
    await loadMore({ eventId });
    target = rows.value.find((row) => row.event_id === eventId);
    if (!target) {
      try {
        target = await getAuditEvent(eventId);
        const seen = new Set(rows.value.map((row) => row.sequence));
        if (!seen.has(target.sequence)) {
          rows.value.push(target);
          syncGrid();
        }
      } catch {
        target = undefined;
      }
    }
    if (target) {
      highlightSequence.value = target.sequence;
    }
  }
  if (target) {
    await scrollToHighlightedRow(target);
    detailDrawerApi
      .setData({
        brokenAt: brokenAt.value,
        event: target,
        verified: verified.value,
      })
      .open();
  }
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<ControlFactorAuditEventInfo>) {
  if (code === 'detail') {
    detailDrawerApi
      .setData({
        brokenAt: brokenAt.value,
        event: row,
        verified: verified.value,
      })
      .open();
  }
}

onMounted(async () => {
  await loadMore();
  await locateFromQuery();
});

watch(
  () => [route.query.event_id, route.query.sequence],
  () => {
    void locateFromQuery();
  },
);
</script>

<template>
  <Page auto-content-height>
    <Alert
      class="mb-4"
      show-icon
      :type="verified ? 'success' : 'error'"
      :message="
        verified
          ? $t('page.audit.verified')
          : $t('page.audit.broken', { sequence: brokenAt })
      "
    />
    <Grid :table-title="$t('page.audit.title')">
      <template #toolbar-tools>
        <Button :loading="loading" @click="loadMore()">
          {{ $t('page.audit.actions.loadMore') }}
        </Button>
      </template>
    </Grid>
    <DetailDrawer />
  </Page>
</template>
