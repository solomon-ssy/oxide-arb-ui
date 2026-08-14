<script lang="ts" setup>
import type { ConfigActivityView } from '@vben/types/config-api';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { useRequestHandler } from '@vben/request/qp';

import {
  Button,
  Descriptions,
  DescriptionsItem,
  Empty,
  Skeleton,
  Tag,
} from 'antdv-next';

import { getConfigActivity } from '#/api/config';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import WorkspaceInspectorSurface from '#/shared/components/workspace/workspace-inspector-surface.vue';

defineOptions({ name: 'ConfigActivityPage' });

const route = useRoute();
const router = useRouter();
const { handleRequest } = useRequestHandler();
const loading = ref(true);
const activity = ref<ConfigActivityView[]>([]);

const inspectorIdentity = computed(() => {
  const entity = Array.isArray(route.query.entity)
    ? route.query.entity[0]
    : route.query.entity;
  const id = Array.isArray(route.query.id) ? route.query.id[0] : route.query.id;
  return typeof id === 'string' &&
    (entity === 'config-activation' || entity === 'config-version')
    ? { entity, id }
    : null;
});
const selectedActivity = computed(() => {
  const identity = inspectorIdentity.value;
  if (!identity) return null;
  return (
    activity.value.find((item) => {
      if (
        identity.entity === 'config-activation' &&
        item.event_type === 'activation'
      ) {
        return item.event.policy_activation_id === identity.id;
      }
      if (
        identity.entity === 'config-version' &&
        item.event_type === 'revision'
      ) {
        return item.event.policy_revision_id === identity.id;
      }
      return false;
    }) ?? null
  );
});
const inspectorOpen = computed({
  get: () => inspectorIdentity.value !== null,
  set: (value: boolean) => {
    if (value) return;
    const { entity: _entity, id: _id, ...query } = route.query;
    void router.push({ query });
  },
});
const inspectorTitle = computed(() =>
  selectedActivity.value
    ? $t(`page.config.activity.event.${selectedActivity.value.event_type}`)
    : $t('page.config.activity.title'),
);

function timestamp(item: ConfigActivityView) {
  switch (item.event_type) {
    case 'activation': {
      return item.event.activated_at;
    }
    case 'approval': {
      return item.event.decided_at;
    }
    case 'revision': {
      return item.event.created_at;
    }
  }
}

function actor(item: ConfigActivityView) {
  switch (item.event_type) {
    case 'activation': {
      return item.event.activated_by.label;
    }
    case 'approval': {
      return item.event.decided_by.label;
    }
    case 'revision': {
      return item.event.created_by.label;
    }
  }
}

function resource(item: ConfigActivityView) {
  return item.event.resource_kind;
}

function eventIdentity(item: ConfigActivityView) {
  if (item.event_type === 'activation') {
    return {
      entity: 'config-activation',
      id: item.event.policy_activation_id,
    } as const;
  }
  if (item.event_type === 'revision') {
    return {
      entity: 'config-version',
      id: item.event.policy_revision_id,
    } as const;
  }
  return null;
}

function openActivity(item: ConfigActivityView) {
  const identity = eventIdentity(item);
  if (!identity) return;
  void router.push({
    query: { ...route.query, ...identity, module: 'history' },
  });
}

async function loadActivity() {
  loading.value = true;
  const result = await handleRequest(() => getConfigActivity(100));
  if (result) activity.value = result;
  loading.value = false;
}

onMounted(() => void loadActivity());

watch(
  [loading, inspectorIdentity, selectedActivity],
  ([isLoading, identity, selected]) => {
    if (isLoading || !identity || selected) return;
    const { entity: _entity, id: _id, ...query } = route.query;
    void router.replace({ query });
  },
);
</script>

<template>
  <Page auto-content-height data-testid="config-activity">
    <div class="mx-auto flex max-w-[1080px] flex-col gap-4 pb-8">
      <header class="bg-card rounded-xl border p-5">
        <div class="flex items-start gap-3">
          <Button
            :aria-label="$t('page.config.nav.back')"
            shape="circle"
            type="text"
            @click="router.push('/system/config')"
          >
            <IconifyIcon icon="lucide:arrow-left" />
          </Button>
          <span class="section-icon">
            <IconifyIcon icon="lucide:history" />
          </span>
          <div>
            <p class="config-eyebrow text-xs font-semibold tracking-wide">
              {{ $t('page.config.eyebrow') }}
            </p>
            <h1 class="text-xl font-semibold">
              {{ $t('page.config.activity.title') }}
            </h1>
            <p class="text-muted-foreground mt-1 text-sm">
              {{ $t('page.config.activity.description') }}
            </p>
          </div>
        </div>
      </header>

      <Skeleton v-if="loading" :paragraph="{ rows: 12 }" active />
      <section v-else class="bg-card rounded-xl border p-5">
        <ol v-if="activity.length > 0" class="activity-list">
          <li
            v-for="item in activity"
            :key="`${item.event_type}:${timestamp(item)}`"
            :aria-label="
              eventIdentity(item)
                ? $t(`page.config.activity.event.${item.event_type}`)
                : undefined
            "
            :role="eventIdentity(item) ? 'button' : undefined"
            :tabindex="eventIdentity(item) ? 0 : undefined"
            @click="openActivity(item)"
            @keydown.enter="openActivity(item)"
            @keydown.space.prevent="openActivity(item)"
          >
            <span class="activity-icon">
              <IconifyIcon
                :icon="
                  item.event_type === 'activation'
                    ? 'lucide:circle-check-big'
                    : item.event_type === 'approval'
                      ? 'lucide:badge-check'
                      : 'lucide:file-pen-line'
                "
              />
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-sm font-semibold">
                  {{ $t(`page.config.activity.event.${item.event_type}`) }}
                </h2>
                <Tag>
                  {{ $t(`page.config.resources.kind.${resource(item)}`) }}
                </Tag>
              </div>
              <p class="text-muted-foreground mt-1 text-sm">
                {{ actor(item) }} · {{ item.event.reason }}
              </p>
            </div>
            <time
              class="text-muted-foreground text-xs"
              data-screenshot-volatile="true"
            >
              {{ formatDateTimeLocal(timestamp(item)) }}
            </time>
          </li>
        </ol>
        <Empty v-else :description="$t('page.config.activity.empty')" />
      </section>
    </div>

    <WorkspaceInspectorSurface
      v-model:open="inspectorOpen"
      :loading="loading"
      :title="inspectorTitle"
    >
      <Descriptions v-if="selectedActivity" :column="1" bordered size="small">
        <DescriptionsItem :label="$t('page.config.resource.status')">
          {{ $t(`page.config.activity.event.${selectedActivity.event_type}`) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.config.resource.title')">
          {{ $t(`page.config.resources.kind.${resource(selectedActivity)}`) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.config.resource.revision')">
          <span class="font-mono">
            {{ selectedActivity.event.policy_revision_id }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.config.resource.createdBy')">
          {{ actor(selectedActivity) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.config.resource.createdAt')">
          {{ formatDateTimeLocal(timestamp(selectedActivity)) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.config.activity.reason')">
          {{ selectedActivity.event.reason }}
        </DescriptionsItem>
      </Descriptions>
    </WorkspaceInspectorSurface>
  </Page>
</template>

<style scoped>
.config-eyebrow {
  color: hsl(var(--foreground));
}

.section-icon,
.activity-icon {
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
}

.section-icon {
  width: 2.5rem;
  height: 2.5rem;
  font-size: 1.15rem;
  border-radius: 0.65rem;
}

.activity-list li {
  position: relative;
  display: flex;
  gap: 0.9rem;
  align-items: flex-start;
  padding: 0.9rem 0;
}

.activity-list li[role='button'] {
  cursor: pointer;
  border-radius: var(--qp-radius-md);
}

.activity-list li[role='button']:hover {
  background: hsl(var(--workspace-accent) / 6%);
}

.activity-list li[role='button']:focus-visible {
  outline: 2px solid hsl(var(--workspace-accent));
  outline-offset: 2px;
  box-shadow: var(--qp-shadow-focus);
}

.activity-list li + li {
  border-top: 1px solid hsl(var(--border));
}

.activity-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
}

@media (max-width: 640px) {
  .activity-list li {
    flex-wrap: wrap;
  }

  .activity-list time {
    margin-left: 2.9rem;
  }
}
</style>
