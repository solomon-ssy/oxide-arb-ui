<script lang="ts" setup>
import type {
  DomainCursorStatus,
  DomainSourceExpectationView,
} from '@vben/types';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Button, Card, Statistic, Tag } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { listDomainSources } from '#/api/vertical-alpha';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';

import { summarizeDomainSources } from './modules/domain-source-presentation';
import { useDomainSourceColumns } from './modules/schemas/table-columns';

defineOptions({ name: 'ResearchDomainSourcesPage' });

const { handleRequest } = useRequestHandler();

const rows = ref<DomainSourceExpectationView[]>([]);
const loadState = ref<'error' | 'idle' | 'loaded' | 'loading'>('idle');

const summary = computed(() => summarizeDomainSources(rows.value));
const loadAnnouncement = computed(() => {
  switch (loadState.value) {
    case 'error': {
      return $t('page.research.domainSources.loadFailedAnnouncement');
    }
    case 'loaded': {
      return rows.value.length === 0
        ? $t('page.research.domainSources.emptyAnnouncement')
        : $t('page.research.domainSources.loadedAnnouncement', {
            count: rows.value.length,
          });
    }
    case 'loading': {
      return $t('page.research.domainSources.loadingAnnouncement');
    }
    default: {
      return '';
    }
  }
});

const emptyPage = {
  has_next: false,
  items: [] as DomainSourceExpectationView[],
  page: 1,
  size: 0,
  total: 0,
};

const [Grid, gridApi] = useVbenVxeGrid<DomainSourceExpectationView>({
  gridOptions: {
    columns: useDomainSourceColumns(),
    pagerConfig: { enabled: false },
    proxyConfig: {
      ajax: {
        query: async () => {
          loadState.value = 'loading';
          const data = await handleRequest(() => listDomainSources());
          if (data === null) {
            rows.value = [];
            loadState.value = 'error';
          } else {
            rows.value = data;
            loadState.value = 'loaded';
          }
          return {
            ...emptyPage,
            items: rows.value,
            total: rows.value.length,
          };
        },
      },
      response: {
        list: 'items',
        result: 'items',
        total: 'total',
      },
    },
    rowConfig: { keyField: 'expectation_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

async function refresh() {
  await gridApi.query();
}

onMounted(() => {
  void refresh();
});

function cursorStatusColor(status: DomainCursorStatus) {
  switch (status) {
    case 'backfilling': {
      return 'processing';
    }
    case 'bootstrap': {
      return 'default';
    }
    case 'error': {
      return 'error';
    }
    case 'live': {
      return 'success';
    }
  }
}
</script>

<template>
  <Page auto-content-height data-testid="domain-sources-page">
    <p aria-atomic="true" aria-live="polite" class="sr-only" role="status">
      {{ loadAnnouncement }}
    </p>
    <div class="mb-4 flex flex-wrap gap-4">
      <Card
        size="small"
        :title="$t('page.research.domainSources.cards.crypto')"
      >
        <Statistic
          :title="$t('page.research.domainSources.cards.activeCursors')"
          :value="summary.crypto"
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
          :value="summary.weather"
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
          :suffix="summary.worstLagSecs === null ? undefined : 's'"
          :title="$t('page.research.domainSources.cards.worstLag')"
          :value="
            summary.worstLagSecs ??
            $t('page.research.domainSources.cards.notObserved')
          "
        />
        <div class="mt-2 flex flex-wrap gap-2">
          <Tag :color="summary.stale > 0 ? 'warning' : 'success'">
            {{
              $t('page.research.domainSources.cards.staleCursors', {
                count: summary.stale,
              })
            }}
          </Tag>
          <Tag :color="summary.errors > 0 ? 'error' : 'success'">
            {{
              $t('page.research.domainSources.cards.errorCursors', {
                count: summary.errors,
              })
            }}
          </Tag>
          <Tag :color="summary.notObserved > 0 ? 'default' : 'success'">
            {{
              $t('page.research.domainSources.cards.notObservedCursors', {
                count: summary.notObserved,
              })
            }}
          </Tag>
        </div>
      </Card>
    </div>

    <Grid :table-title="$t('page.research.domainSources.table.title')">
      <template #toolbar-tools>
        <Button class="min-h-11 min-w-11" type="primary" @click="refresh">
          {{ $t('page.research.domainSources.refresh') }}
        </Button>
      </template>
      <template #instrument="{ row }">
        <span class="break-all font-mono text-xs">{{
          row.instrument_key
        }}</span>
      </template>
      <template #lag="{ row }">
        <span
          v-if="row.lag_secs !== null"
          :class="
            row.status === 'stale' || row.status === 'error'
              ? 'font-medium text-destructive'
              : undefined
          "
        >
          {{ row.lag_secs }}
        </span>
        <span v-else class="text-muted-foreground">
          {{ $t('page.research.domainSources.notObserved') }}
        </span>
      </template>
      <template #statusReason="{ row }">
        <span
          v-if="row.status_reason"
          class="break-all font-mono text-xs text-destructive"
        >
          {{ row.status_reason }}
        </span>
        <span v-else class="text-muted-foreground">—</span>
      </template>
      <template #cursorStatus="{ row }">
        <Tag
          v-if="row.cursor_status"
          :color="cursorStatusColor(row.cursor_status)"
        >
          {{ $t(`enum.domainCursorStatus.${row.cursor_status}`) }}
        </Tag>
        <span v-else class="text-muted-foreground">
          {{ $t('page.research.domainSources.notObserved') }}
        </span>
      </template>
      <template #required="{ row }">
        <div class="flex flex-wrap gap-1">
          <Tag :color="row.required ? 'blue' : 'default'">
            {{
              $t(
                row.required
                  ? 'page.research.domainSources.required'
                  : 'page.research.domainSources.optional',
              )
            }}
          </Tag>
          <Tag v-if="row.credential_required" color="warning">
            {{ $t('page.research.domainSources.credentialRequired') }}
          </Tag>
        </div>
      </template>
      <template #checkpoint="{ row }">
        <div v-if="row.checkpoint" class="font-mono text-xs">
          <div>{{ row.checkpoint.kind }}</div>
          <div
            v-if="row.checkpoint_hash"
            class="break-all text-muted-foreground"
          >
            {{ row.checkpoint_hash }}
          </div>
        </div>
        <span v-else class="text-muted-foreground">
          {{ $t('page.research.domainSources.notObserved') }}
        </span>
      </template>
      <template #lastEvent="{ row }">
        <span v-if="row.last_event_time">
          {{ formatDateTimeLocal(row.last_event_time) }}
        </span>
        <span v-else class="text-muted-foreground">
          {{ $t('page.research.domainSources.notObserved') }}
        </span>
      </template>
      <template #cursorUpdated="{ row }">
        <span v-if="row.cursor_updated_at">
          {{ formatDateTimeLocal(row.cursor_updated_at) }}
        </span>
        <span v-else class="text-muted-foreground">
          {{ $t('page.research.domainSources.notObserved') }}
        </span>
      </template>
      <template #affected="{ row }">
        <span class="text-xs">
          {{
            $t('page.research.domainSources.affectedCounts', {
              markets: row.affected_market_ids.length,
              profiles: row.affected_profile_ids.length,
            })
          }}
        </span>
      </template>
    </Grid>
  </Page>
</template>
