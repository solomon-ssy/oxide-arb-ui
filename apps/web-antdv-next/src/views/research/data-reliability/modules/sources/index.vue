<script lang="ts" setup>
import type {
  DomainCursorStatus,
  DomainSourceExpectationView,
  DomainSourceSnapshotStatus,
  DomainSourcesSnapshot,
} from '@vben/types';

import type { EnumTone } from '#/shared/presentation/enum-presentation';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Alert, Button, Card, Statistic, Tag } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { listDomainSources } from '#/api/vertical-alpha';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import StatusChip from '#/shared/components/status-chip.vue';

import { useDomainSourceColumns } from './modules/schemas/table-columns';

defineOptions({ name: 'ResearchDomainSourcesPage' });

const { handleRequest } = useRequestHandler();

const rows = ref<DomainSourceExpectationView[]>([]);
const snapshot = ref<DomainSourcesSnapshot | null>(null);
const loadState = ref<'error' | 'idle' | 'loaded' | 'loading'>('idle');

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
          snapshot.value = null;
          rows.value = [];
          const data = await handleRequest(() => listDomainSources(), {
            silent: true,
          });
          if (data === null) {
            loadState.value = 'error';
          } else {
            snapshot.value = data;
            rows.value = data.items;
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

function cursorStatusTone(status: DomainCursorStatus): EnumTone {
  switch (status) {
    case 'backfilling': {
      return 'running';
    }
    case 'bootstrap': {
      return 'queued';
    }
    case 'error': {
      return 'danger';
    }
    case 'live': {
      return 'success';
    }
  }
}

function snapshotStatusTone(status: DomainSourceSnapshotStatus): EnumTone {
  switch (status) {
    case 'blocked': {
      return 'danger';
    }
    case 'declared': {
      return 'running';
    }
    case 'live': {
      return 'success';
    }
    case 'stale': {
      return 'warning';
    }
    case 'unobserved': {
      return 'neutral';
    }
  }
}
</script>

<template>
  <Page
    :aria-busy="loadState === 'loading'"
    auto-content-height
    data-testid="domain-sources-page"
  >
    <p aria-atomic="true" aria-live="polite" class="sr-only" role="status">
      {{ loadAnnouncement }}
    </p>
    <Alert
      v-if="loadState === 'error'"
      class="mb-4"
      :description="$t('page.research.domainSources.loadFailedDescription')"
      :message="$t('page.research.domainSources.loadFailedAnnouncement')"
      show-icon
      type="error"
    >
      <template #action>
        <Button class="min-h-11 min-w-11" type="primary" @click="refresh">
          {{ $t('page.research.domainSources.retry') }}
        </Button>
      </template>
    </Alert>

    <div v-if="snapshot" class="mb-4 flex flex-wrap gap-4">
      <Card
        size="small"
        :title="$t('page.research.domainSources.cards.crypto')"
      >
        <Statistic
          :title="$t('page.research.domainSources.cards.live')"
          :value="snapshot.summary_by_family.crypto.live"
        />
        <div class="mt-2 flex flex-wrap gap-2">
          <Tag color="processing">
            {{
              $t('page.research.domainSources.cards.declared', {
                count: snapshot.summary_by_family.crypto.declared,
              })
            }}
          </Tag>
          <Tag
            :color="
              snapshot.summary_by_family.crypto.stale > 0
                ? 'warning'
                : 'success'
            "
          >
            {{
              $t('page.research.domainSources.cards.stale', {
                count: snapshot.summary_by_family.crypto.stale,
              })
            }}
          </Tag>
          <Tag
            :color="
              snapshot.summary_by_family.crypto.blocked > 0
                ? 'error'
                : 'success'
            "
          >
            {{
              $t('page.research.domainSources.cards.blocked', {
                count: snapshot.summary_by_family.crypto.blocked,
              })
            }}
          </Tag>
          <Tag
            :color="
              snapshot.summary_by_family.crypto.unobserved > 0
                ? 'default'
                : 'success'
            "
          >
            {{
              $t('page.research.domainSources.cards.unobserved', {
                count: snapshot.summary_by_family.crypto.unobserved,
              })
            }}
          </Tag>
        </div>
      </Card>
      <Card
        size="small"
        :title="$t('page.research.domainSources.cards.weather')"
      >
        <Statistic
          :title="$t('page.research.domainSources.cards.live')"
          :value="snapshot.summary_by_family.weather.live"
        />
        <div class="mt-2 flex flex-wrap gap-2">
          <Tag color="processing">
            {{
              $t('page.research.domainSources.cards.declared', {
                count: snapshot.summary_by_family.weather.declared,
              })
            }}
          </Tag>
          <Tag
            :color="
              snapshot.summary_by_family.weather.stale > 0
                ? 'warning'
                : 'success'
            "
          >
            {{
              $t('page.research.domainSources.cards.stale', {
                count: snapshot.summary_by_family.weather.stale,
              })
            }}
          </Tag>
          <Tag
            :color="
              snapshot.summary_by_family.weather.blocked > 0
                ? 'error'
                : 'success'
            "
          >
            {{
              $t('page.research.domainSources.cards.blocked', {
                count: snapshot.summary_by_family.weather.blocked,
              })
            }}
          </Tag>
          <Tag
            :color="
              snapshot.summary_by_family.weather.unobserved > 0
                ? 'default'
                : 'success'
            "
          >
            {{
              $t('page.research.domainSources.cards.unobserved', {
                count: snapshot.summary_by_family.weather.unobserved,
              })
            }}
          </Tag>
        </div>
      </Card>
      <Card
        size="small"
        :title="$t('page.research.domainSources.cards.health')"
      >
        <Statistic
          data-screenshot-volatile="true"
          :title="$t('page.research.domainSources.cards.observedAt')"
          :value="formatDateTimeLocal(snapshot.observed_at)"
        />
        <div class="mt-2 flex flex-wrap gap-2">
          <Tag>
            {{
              $t('page.research.domainSources.cards.familyLag', {
                family: $t('page.research.domainSources.cards.crypto'),
                lag:
                  snapshot.summary_by_family.crypto.worst_lag_secs ??
                  $t('page.research.domainSources.notObserved'),
              })
            }}
          </Tag>
          <Tag>
            {{
              $t('page.research.domainSources.cards.familyLag', {
                family: $t('page.research.domainSources.cards.weather'),
                lag:
                  snapshot.summary_by_family.weather.worst_lag_secs ??
                  $t('page.research.domainSources.notObserved'),
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
      <template #snapshotStatus="{ row }">
        <StatusChip :tone="snapshotStatusTone(row.snapshot_status)">
          {{ $t(`enum.domainSourceSnapshotStatus.${row.snapshot_status}`) }}
        </StatusChip>
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
        <StatusChip
          v-if="row.cursor_status"
          :tone="cursorStatusTone(row.cursor_status)"
        >
          {{ $t(`enum.domainCursorStatus.${row.cursor_status}`) }}
        </StatusChip>
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
