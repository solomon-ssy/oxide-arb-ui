<script lang="ts" setup>
import type {
  RuntimeActivityDomain,
  RuntimeActivityPageView,
  RuntimeActivityStatus,
} from '@vben/types';

import { computed, onMounted, onScopeDispose, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';
import { useRequestHandler } from '@vben/request/qp';

import { Badge, Button, Drawer, Flex, Tooltip } from 'antdv-next';

import { listRuntimeActivities } from '#/api/runtime-activities';
import { $t } from '#/locales';
import RuntimeActivityFeed from '#/shared/components/activity/activity-feed.vue';
import EnumSelect from '#/shared/components/enum/enum-select.vue';
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
let requestGeneration = 0;
let controller: AbortController | null = null;

const badgeCount = computed(
  () =>
    (page.value?.indicator.running ?? 0) +
    (page.value?.indicator.attention ?? 0),
);
const items = computed(() => page.value?.items ?? []);

const domainOptions = enumOptions('RuntimeActivityDomain');
const statusOptions = enumOptions('RuntimeActivityStatus');

async function load() {
  const generation = ++requestGeneration;
  controller?.abort();
  controller = new AbortController();
  loading.value = true;
  const result = await handleRequest(
    () =>
      listRuntimeActivities(
        { domain: domain.value, limit: 25, status: status.value },
        controller?.signal,
      ),
    { silent: true },
  );
  if (generation === requestGeneration && result !== null) {
    page.value = result;
  }
  if (generation === requestGeneration) {
    loading.value = false;
  }
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

watch([domain, status], () => void load());
watch(
  () => activityStore.refreshGeneration,
  () => void load(),
);
onMounted(() => void load());
onScopeDispose(() => {
  requestGeneration += 1;
  controller?.abort();
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

  <Drawer
    v-model:open="open"
    class="activity-drawer"
    placement="right"
    :title="$t('page.runtimeActivity.title')"
    :size="520"
  >
    <template #extra>
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
    </template>

    <Flex class="activity-filters" gap="small" wrap="wrap">
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

    <RuntimeActivityFeed :height="560" :items="items" :loading="loading" />

    <template #footer>
      <Flex align="center" justify="space-between">
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
    </template>
  </Drawer>
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

:global(.activity-drawer .ant-drawer-content) {
  background: hsl(var(--qp-surface-overlay) / 88%);
  border-inline-start: 1px solid hsl(var(--qp-border-subtle));
  box-shadow: var(--qp-shadow-medium);
  backdrop-filter: blur(18px);
}

:global(.activity-drawer .ant-drawer-body) {
  padding: 14px;
}
</style>
