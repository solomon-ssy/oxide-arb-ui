<script lang="ts" setup>
import type {
  RuntimeActivityDomain,
  RuntimeActivityPageView,
  RuntimeActivityStatus,
  RuntimeActivityView,
} from '@vben/types';

import { computed, onMounted, onScopeDispose, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';
import { useRequestHandler } from '@vben/request/qp';

import { Badge, Button, Flex, Tooltip } from 'antdv-next';

import { listRuntimeActivities } from '#/api/runtime-activities';
import { $t } from '#/locales';
import RuntimeActivityFeed from '#/shared/components/activity/activity-feed.vue';
import EnumSelect from '#/shared/components/enum/enum-select.vue';
import WorkspaceInspectorSurface from '#/shared/components/workspace/workspace-inspector-surface.vue';
import { AuthoritativeReadCoordinator } from '#/shared/composables/authoritative-read-coordinator';
import { enumOptions } from '#/shared/presentation/enum-options';
import { useActivityStore } from '#/store/activity';

defineOptions({ name: 'ActivityCenter' });

const router = useRouter();
const activityStore = useActivityStore();
const { handleRequest } = useRequestHandler();

const open = ref(false);
const loading = ref(false);
const domain = ref<RuntimeActivityDomain>();
const status = ref<RuntimeActivityStatus>();
const page = ref<null | RuntimeActivityPageView>(null);

const badgeCount = computed(
  () =>
    (page.value?.indicator.running ?? 0) +
    (page.value?.indicator.attention ?? 0),
);
const items = computed(() => page.value?.items ?? []);

const domainOptions = enumOptions('RuntimeActivityDomain');
const statusOptions = enumOptions('RuntimeActivityStatus');

function readKey() {
  return `${domain.value ?? ''}\u0000${status.value ?? ''}`;
}

const readCoordinator = new AuthoritativeReadCoordinator<
  string,
  null | RuntimeActivityPageView
>({
  fetchSnapshot: (_key, signal) =>
    handleRequest(
      () =>
        listRuntimeActivities(
          { domain: domain.value, limit: 25, status: status.value },
          signal,
        ),
      { silent: true },
    ),
  initialKey: readKey(),
  onError: (error) => {
    void handleRequest(() => Promise.reject(error), { silent: true });
  },
  onPendingChange: (pending) => {
    loading.value = pending;
  },
  onSnapshot: (snapshot) => {
    if (snapshot !== null) page.value = snapshot;
  },
});

function load() {
  return readCoordinator.refresh();
}

function viewAll() {
  open.value = false;
  void router.push({
    path: '/runtime/activity',
    query: {
      domain: domain.value,
      status: status.value,
    },
  });
}

function openActivity(item: RuntimeActivityView) {
  open.value = false;
  void router.push({
    path: '/runtime/activity',
    query: {
      domain: domain.value,
      entity: item.entity.kind,
      id: item.entity.id,
      status: status.value,
    },
  });
}

watch([domain, status], () => readCoordinator.changeKey(readKey()));
watch(
  () => activityStore.refreshGeneration,
  () => readCoordinator.invalidate(),
);
onMounted(() => void load());
onScopeDispose(() => {
  void readCoordinator.drain().finally(() => readCoordinator.dispose());
});
</script>

<template>
  <Tooltip :title="$t('page.runtimeActivity.open')">
    <Badge
      :count="badgeCount"
      :offset="[-7, 7]"
      :overflow-count="99"
      :show-zero="false"
    >
      <button
        :aria-label="$t('page.runtimeActivity.open')"
        class="activity-trigger"
        data-testid="activity-center-trigger"
        type="button"
        @click="open = true"
      >
        <IconifyIcon icon="lucide:activity" />
      </button>
    </Badge>
  </Tooltip>

  <WorkspaceInspectorSurface
    v-model:open="open"
    test-id="activity-center-inspector"
    :title="$t('page.runtimeActivity.title')"
  >
    <Flex class="activity-filters" gap="small" justify="space-between">
      <Flex gap="small" wrap="wrap">
        <EnumSelect
          v-model:value="domain"
          allow-clear
          :aria-label="$t('page.runtimeActivity.filter.domain')"
          :options="domainOptions"
          :placeholder="$t('page.runtimeActivity.filter.allDomains')"
        />
        <EnumSelect
          v-model:value="status"
          allow-clear
          :aria-label="$t('page.runtimeActivity.filter.status')"
          :options="statusOptions"
          :placeholder="$t('page.runtimeActivity.filter.allStatuses')"
        />
      </Flex>
      <Button
        :aria-label="$t('page.runtimeActivity.refresh')"
        size="small"
        type="text"
        @click="load"
      >
        <IconifyIcon
          :class="{ 'animate-spin': loading }"
          icon="lucide:refresh-cw"
        />
      </Button>
    </Flex>

    <RuntimeActivityFeed
      :height="560"
      :items="items"
      :loading="loading"
      @select="openActivity"
    />

    <Flex align="center" class="activity-footer" justify="space-between">
      <span class="activity-total">
        {{
          $t('page.runtimeActivity.total', {
            count: page?.summary.total ?? 0,
          })
        }}
      </span>
      <Button type="primary" @click="viewAll">
        {{ $t('page.runtimeActivity.viewAll') }}
        <IconifyIcon icon="lucide:arrow-right" />
      </Button>
    </Flex>
  </WorkspaceInspectorSurface>
</template>

<style scoped>
.activity-trigger {
  position: relative;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  color: hsl(var(--qp-text-secondary));
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: var(--qp-radius-md);
  transition:
    color var(--qp-motion-instant) var(--qp-motion-ease-out),
    background-color var(--qp-motion-instant) var(--qp-motion-ease-out);
}

.activity-trigger:hover {
  color: hsl(var(--qp-accent-realtime));
  background: hsl(var(--qp-surface-raised));
}

.activity-filters {
  margin-bottom: 14px;
}

.activity-filters :deep(.ant-select) {
  flex: 1;
  min-width: 172px;
}

.activity-total {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: hsl(var(--qp-text-muted));
}

.activity-footer {
  padding-top: 12px;
  margin-top: 14px;
  border-top: 1px solid hsl(var(--qp-border-subtle));
}
</style>
