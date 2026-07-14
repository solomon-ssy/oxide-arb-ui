<script lang="ts" setup>
import type { DomainSourceCursorView } from '@vben/types';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Button, Card, Statistic, Tag } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { listDomainSources } from '#/api/vertical-alpha';
import { $t } from '#/locales';

import { useDomainSourceColumns } from './modules/schemas/table-columns';

defineOptions({ name: 'ResearchDomainSourcesPage' });

const STALE_LAG_SECS = 300;
const CRITICAL_LAG_SECS = 600;

const { handleRequest } = useRequestHandler();

const rows = ref<DomainSourceCursorView[]>([]);

const cryptoRows = computed(() =>
  rows.value.filter((row) => row.family === 'crypto'),
);
const weatherRows = computed(() =>
  rows.value.filter((row) => row.family === 'weather'),
);

const worstLag = computed(() => {
  if (rows.value.length === 0) {
    return 0;
  }
  return Math.max(...rows.value.map((row) => row.lag_secs));
});

const staleCount = computed(
  () => rows.value.filter((row) => row.lag_secs > STALE_LAG_SECS).length,
);

const errorCount = computed(
  () => rows.value.filter((row) => row.status === 'error').length,
);

const emptyPage = {
  has_next: false,
  items: [] as DomainSourceCursorView[],
  page: 1,
  size: 0,
  total: 0,
};

const [Grid, gridApi] = useVbenVxeGrid<DomainSourceCursorView>({
  gridOptions: {
    columns: useDomainSourceColumns(),
    pagerConfig: { enabled: false },
    proxyConfig: {
      ajax: {
        query: async () => {
          const data = await handleRequest(() => listDomainSources());
          rows.value = data ?? [];
          return {
            ...emptyPage,
            items: rows.value,
            total: rows.value.length,
          };
        },
      },
    },
    rowConfig: { keyField: 'instrument_key' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

async function refresh() {
  await gridApi.query();
}

onMounted(() => {
  void refresh();
});

function lagTagColor(lag: number) {
  if (lag > CRITICAL_LAG_SECS) {
    return 'error';
  }
  if (lag > STALE_LAG_SECS) {
    return 'warning';
  }
  return 'success';
}

function lagClass(lag: number) {
  return lag > STALE_LAG_SECS ? 'font-medium text-destructive' : undefined;
}
</script>

<template>
  <Page auto-content-height>
    <div class="mb-4 flex flex-wrap gap-4">
      <Card
        size="small"
        :title="$t('page.research.domainSources.cards.crypto')"
      >
        <Statistic
          :title="$t('page.research.domainSources.cards.activeCursors')"
          :value="cryptoRows.length"
        />
        <div class="mt-2 text-xs text-muted-foreground">
          {{ $t('page.research.domainSources.cards.cryptoHint') }}
        </div>
      </Card>
      <Card
        size="small"
        :title="$t('page.research.domainSources.cards.weather')"
      >
        <Statistic
          :title="$t('page.research.domainSources.cards.activeFeeds')"
          :value="weatherRows.length"
        />
        <div class="mt-2 text-xs text-muted-foreground">
          {{ $t('page.research.domainSources.cards.weatherHint') }}
        </div>
      </Card>
      <Card
        size="small"
        :title="$t('page.research.domainSources.cards.health')"
      >
        <Statistic
          suffix="s"
          :title="$t('page.research.domainSources.cards.worstLag')"
          :value="worstLag"
        />
        <div class="mt-2 flex flex-wrap gap-2">
          <Tag :color="lagTagColor(worstLag)">
            {{
              $t('page.research.domainSources.cards.staleCursors', {
                count: staleCount,
              })
            }}
          </Tag>
          <Tag :color="errorCount > 0 ? 'error' : 'success'">
            {{
              $t('page.research.domainSources.cards.errorCursors', {
                count: errorCount,
              })
            }}
          </Tag>
        </div>
      </Card>
    </div>

    <Grid :table-title="$t('page.research.domainSources.table.title')">
      <template #toolbar-tools>
        <Button type="primary" @click="refresh">
          {{ $t('page.research.domainSources.refresh') }}
        </Button>
      </template>
      <template #instrument="{ row }">
        <span class="break-all font-mono text-xs">{{
          row.instrument_key
        }}</span>
      </template>
      <template #lag="{ row }">
        <span :class="lagClass(row.lag_secs)">{{ row.lag_secs }}</span>
      </template>
      <template #lastError="{ row }">
        <span
          v-if="row.last_error"
          class="break-all font-mono text-xs text-destructive"
        >
          {{ row.last_error }}
        </span>
        <span v-else class="text-muted-foreground">—</span>
      </template>
      <template #checkpoint="{ row }">
        <div class="font-mono text-xs">
          <div>{{ row.checkpoint.kind }}</div>
          <div class="break-all text-muted-foreground">
            {{ row.checkpoint_hash }}
          </div>
        </div>
      </template>
    </Grid>
  </Page>
</template>
