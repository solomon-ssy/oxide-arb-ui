<script lang="ts" setup>
import type {
  ConfigActivityView,
  ConfigResourcesView,
  DeploymentConfigView,
  LifecycleView,
} from '@vben/types/config-api';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { useRequestHandler } from '@vben/request/qp';

import { usePreferredReducedMotion } from '@vueuse/core';
import { Alert, Button, Skeleton, Tag } from 'antdv-next';

import {
  getConfigActivity,
  getConfigResources,
  getDeploymentConfigSnapshot,
  getProjectLifecycle,
} from '#/api/config';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';

import {
  CONFIG_RESOURCE_KINDS,
  CONFIG_RESOURCE_META,
} from './modules/resource-metadata';

defineOptions({ name: 'ConfigOverviewPage' });

const router = useRouter();
const { handleRequest } = useRequestHandler();
const reducedMotion = usePreferredReducedMotion();

const loading = ref(true);
const resources = ref<ConfigResourcesView | null>(null);
const lifecycle = ref<LifecycleView | null>(null);
const deployment = ref<DeploymentConfigView | null>(null);
const activity = ref<ConfigActivityView[]>([]);

const orderedResources = computed(() => {
  const byKind = new Map(
    resources.value?.resources.map((resource) => [resource.kind, resource]),
  );
  return CONFIG_RESOURCE_KINDS.map((kind) => byKind.get(kind)).filter(
    (resource) => resource !== undefined,
  );
});

const pendingApprovals = computed(() =>
  orderedResources.value.reduce(
    (sum, resource) => sum + resource.pending_approval_count,
    0,
  ),
);

const restartRequired = computed(
  () =>
    deployment.value?.restart_required === true ||
    orderedResources.value.some((resource) => resource.restart_required),
);

const lastActivation = computed(() =>
  orderedResources.value
    .map((resource) => resource.last_activated_at)
    .filter((value): value is string => typeof value === 'string')
    .toSorted()
    .at(-1),
);

function shortHash(value?: null | string) {
  return value ? `${value.slice(0, 14)}…` : '—';
}

function activityTitle(item: ConfigActivityView) {
  return $t(`page.config.activity.event.${item.event_type}`);
}

function activityTimestamp(item: ConfigActivityView) {
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

function activityActor(item: ConfigActivityView) {
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

async function loadOverview() {
  loading.value = true;
  const result = await handleRequest(() =>
    Promise.all([
      getConfigResources(),
      getProjectLifecycle(),
      getDeploymentConfigSnapshot(),
      getConfigActivity(8),
    ]),
  );
  if (result) {
    [resources.value, lifecycle.value, deployment.value, activity.value] =
      result;
  }
  loading.value = false;
}

function openResource(kind: string) {
  void router.push(`/system/config/${kind}`);
}

function openSection(section: 'activity' | 'deployment' | 'lifecycle') {
  void router.push(`/system/config/${section}`);
}

onMounted(() => void loadOverview());
</script>

<template>
  <Page auto-content-height data-testid="config-overview">
    <div class="mx-auto flex max-w-[1280px] flex-col gap-5 pb-8">
      <section
        class="config-hero bg-card overflow-hidden rounded-xl border p-5"
        :class="{ 'config-motion': reducedMotion !== 'reduce' }"
        aria-labelledby="config-overview-title"
      >
        <div
          class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
        >
          <div class="max-w-2xl">
            <div class="flex items-center gap-2">
              <span class="config-icon config-icon--blue">
                <IconifyIcon icon="lucide:sliders-horizontal" />
              </span>
              <div>
                <p
                  class="config-accent-text text-xs font-semibold tracking-wide"
                >
                  {{ $t('page.config.eyebrow') }}
                </p>
                <h1 id="config-overview-title" class="text-xl font-semibold">
                  {{ $t('page.config.overview.title') }}
                </h1>
              </div>
            </div>
            <p class="text-muted-foreground mt-3 text-sm leading-6">
              {{ $t('page.config.overview.description') }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button @click="openSection('deployment')">
              <IconifyIcon icon="lucide:server-cog" />
              {{ $t('page.config.nav.deployment') }}
            </Button>
            <Button @click="openSection('lifecycle')">
              <IconifyIcon icon="lucide:shield-check" />
              {{ $t('page.config.nav.lifecycle') }}
            </Button>
          </div>
        </div>

        <Skeleton v-if="loading" :paragraph="{ rows: 2 }" active class="mt-5" />
        <dl
          v-else
          class="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-3 xl:grid-cols-6"
        >
          <div class="config-status-cell">
            <dt>{{ $t('page.config.status.environment') }}</dt>
            <dd>{{ lifecycle?.environment ?? '—' }}</dd>
          </div>
          <div class="config-status-cell">
            <dt>{{ $t('page.config.status.lifecycle') }}</dt>
            <dd>
              <Tag
                :class="{
                  'config-success-tag':
                    lifecycle?.state === 'production_frozen',
                  'config-warning-tag':
                    lifecycle?.state !== 'production_frozen',
                }"
                :color="
                  lifecycle?.state === 'production_frozen'
                    ? 'success'
                    : 'warning'
                "
              >
                {{
                  lifecycle
                    ? $t(`page.config.lifecycle.state.${lifecycle.state}`)
                    : '—'
                }}
              </Tag>
            </dd>
          </div>
          <div class="config-status-cell">
            <dt>{{ $t('page.config.status.policyBundle') }}</dt>
            <dd class="font-mono text-xs" data-screenshot-volatile="true">
              {{ shortHash(resources?.active_policy_bundle_hash) }}
            </dd>
          </div>
          <div class="config-status-cell">
            <dt>{{ $t('page.config.status.pendingApproval') }}</dt>
            <dd>{{ pendingApprovals }}</dd>
          </div>
          <div class="config-status-cell">
            <dt>{{ $t('page.config.status.restart') }}</dt>
            <dd>
              <Tag
                :class="{
                  'config-success-tag': !restartRequired,
                  'config-warning-tag': restartRequired,
                }"
                :color="restartRequired ? 'warning' : 'success'"
              >
                {{
                  $t(
                    restartRequired
                      ? 'page.config.status.required'
                      : 'page.config.status.notRequired',
                  )
                }}
              </Tag>
            </dd>
          </div>
          <div class="config-status-cell">
            <dt>{{ $t('page.config.status.lastActivation') }}</dt>
            <dd class="text-xs" data-screenshot-volatile="true">
              {{ lastActivation ? formatDateTimeLocal(lastActivation) : '—' }}
            </dd>
          </div>
        </dl>
      </section>

      <Alert
        v-if="lifecycle?.state === 'pre_production_resettable'"
        :message="$t('page.config.lifecycle.preProductionNotice')"
        show-icon
        type="warning"
      />

      <Skeleton v-if="loading" :paragraph="{ rows: 12 }" active />

      <section v-else aria-labelledby="config-resources-title">
        <div class="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 id="config-resources-title" class="text-base font-semibold">
              {{ $t('page.config.overview.resourcesTitle') }}
            </h2>
            <p class="text-muted-foreground mt-1 text-sm">
              {{ $t('page.config.overview.resourcesDescription') }}
            </p>
          </div>
        </div>
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <button
            v-for="(resource, index) in orderedResources"
            :key="resource.kind"
            class="config-resource-card bg-card focus-visible:ring-primary group rounded-xl border p-4 text-left focus-visible:ring-2 focus-visible:outline-none"
            :class="[
              `config-resource-card--${CONFIG_RESOURCE_META[resource.kind].tone}`,
              { 'config-motion': reducedMotion !== 'reduce' },
            ]"
            :style="{ '--enter-index': index }"
            :data-testid="`config-resource-${resource.kind}`"
            type="button"
            @click="openResource(resource.kind)"
          >
            <div class="flex items-start justify-between gap-3">
              <span
                class="config-icon"
                :class="`config-icon--${CONFIG_RESOURCE_META[resource.kind].tone}`"
              >
                <IconifyIcon :icon="CONFIG_RESOURCE_META[resource.kind].icon" />
              </span>
              <IconifyIcon
                icon="lucide:arrow-up-right"
                class="text-muted-foreground size-4 transition-colors group-hover:text-foreground"
              />
            </div>
            <h3 class="mt-4 text-sm font-semibold">
              {{ $t(CONFIG_RESOURCE_META[resource.kind].labelKey) }}
            </h3>
            <p class="text-muted-foreground mt-1 min-h-10 text-sm leading-5">
              {{ $t(CONFIG_RESOURCE_META[resource.kind].descriptionKey) }}
            </p>
            <dl class="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-xs">
              <div>
                <dt class="text-muted-foreground">
                  {{ $t('page.config.resource.activeRevision') }}
                </dt>
                <dd class="mt-1 font-mono" data-screenshot-volatile="true">
                  {{ shortHash(resource.active_revision_id) }}
                </dd>
              </div>
              <div>
                <dt class="text-muted-foreground">
                  {{ $t('page.config.resource.effectiveBoundary') }}
                </dt>
                <dd class="mt-1">
                  {{
                    $t(`page.config.boundary.${resource.effective_boundary}`)
                  }}
                </dd>
              </div>
            </dl>
            <div class="mt-3 flex items-center justify-between">
              <Tag
                v-if="resource.pending_approval_count > 0"
                class="config-warning-tag"
                color="warning"
              >
                {{
                  $t('page.config.resource.pendingCount', {
                    count: resource.pending_approval_count,
                  })
                }}
              </Tag>
              <Tag v-else class="config-success-tag" color="success">
                {{ $t('page.config.resource.active') }}
              </Tag>
              <span class="config-accent-text text-xs font-medium">
                {{ $t('page.config.resource.open') }}
              </span>
            </div>
          </button>
        </div>
      </section>

      <section
        class="bg-card rounded-xl border p-4"
        aria-labelledby="config-activity-title"
      >
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 id="config-activity-title" class="text-base font-semibold">
              {{ $t('page.config.overview.activityTitle') }}
            </h2>
            <p class="text-muted-foreground mt-1 text-sm">
              {{ $t('page.config.overview.activityDescription') }}
            </p>
          </div>
          <Button size="small" type="link" @click="openSection('activity')">
            {{ $t('page.config.overview.viewAll') }}
          </Button>
        </div>
        <ol v-if="activity.length > 0" class="mt-4 grid gap-1">
          <li
            v-for="item in activity"
            :key="`${item.event_type}-${activityTimestamp(item)}`"
            class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2.5"
          >
            <span
              class="config-accent-icon grid size-8 place-items-center rounded-full"
            >
              <IconifyIcon
                :icon="
                  item.event_type === 'activation'
                    ? 'lucide:rocket'
                    : item.event_type === 'approval'
                      ? 'lucide:badge-check'
                      : 'lucide:file-pen-line'
                "
                class="size-4"
              />
            </span>
            <span class="min-w-0">
              <span class="block truncate text-sm font-medium">
                {{ activityTitle(item) }}
              </span>
              <span class="text-muted-foreground block truncate text-xs">
                {{ activityActor(item) }}
              </span>
            </span>
            <time
              class="text-muted-foreground text-xs"
              data-screenshot-volatile="true"
            >
              {{ formatDateTimeLocal(activityTimestamp(item)) }}
            </time>
          </li>
        </ol>
        <p v-else class="text-muted-foreground py-8 text-center text-sm">
          {{ $t('page.config.activity.empty') }}
        </p>
      </section>
    </div>
  </Page>
</template>

<style scoped>
.config-hero {
  background-image:
    radial-gradient(
      circle at 85% 0%,
      hsl(var(--primary) / 8%),
      transparent 32%
    ),
    linear-gradient(135deg, hsl(var(--card)), hsl(var(--card)));
}

.config-status-cell {
  min-width: 0;
  padding: 0.75rem;
  background: hsl(var(--card));
}

.config-status-cell dt {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}

.config-status-cell dd {
  min-height: 1.5rem;
  margin-top: 0.35rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.config-accent-text {
  color: hsl(var(--foreground));
}

.config-accent-icon {
  color: hsl(var(--foreground));
  background: hsl(var(--muted));
}

.text-muted-foreground {
  color: hsl(var(--foreground));
}

.config-success-tag {
  color: hsl(var(--foreground)) !important;
  background-color: hsl(var(--card)) !important;
  border-color: hsl(var(--success)) !important;
}

.config-warning-tag {
  color: hsl(var(--foreground)) !important;
  background-color: hsl(var(--card)) !important;
  border-color: hsl(var(--warning)) !important;
}

.config-icon {
  display: inline-grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  font-size: 1.125rem;
  border-radius: 0.625rem;
}

.config-icon--blue {
  color: #2563eb;
  background: rgb(37 99 235 / 10%);
}

.config-icon--rose {
  color: #e11d48;
  background: rgb(225 29 72 / 10%);
}

.config-icon--purple {
  color: #7c3aed;
  background: rgb(124 58 237 / 10%);
}

.config-icon--cyan {
  color: #0891b2;
  background: rgb(8 145 178 / 10%);
}

.config-icon--amber {
  color: #d97706;
  background: rgb(217 119 6 / 10%);
}

.config-icon--green {
  color: #059669;
  background: rgb(5 150 105 / 10%);
}

.config-resource-card {
  position: relative;
  overflow: hidden;
  transition:
    border-color 120ms ease,
    box-shadow 120ms ease,
    background-color 120ms ease;
}

.config-resource-card::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 2px;
  content: '';
  background: var(--resource-accent, #2563eb);
  opacity: 0;
  transition: opacity 120ms ease;
}

.config-resource-card:hover {
  border-color: hsl(var(--primary) / 35%);
  box-shadow: 0 10px 30px -20px rgb(15 23 42 / 35%);
}

.config-resource-card:hover::before {
  opacity: 1;
}

.config-resource-card--blue {
  --resource-accent: #2563eb;
}

.config-resource-card--rose {
  --resource-accent: #e11d48;
}

.config-resource-card--purple {
  --resource-accent: #7c3aed;
}

.config-resource-card--cyan {
  --resource-accent: #0891b2;
}

.config-resource-card--amber {
  --resource-accent: #d97706;
}

.config-resource-card--green {
  --resource-accent: #059669;
}

.config-motion {
  animation: config-enter 180ms ease-out both;
  animation-delay: min(calc(var(--enter-index, 0) * 25ms), 100ms);
}

@keyframes config-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .config-motion {
    animation: none !important;
  }

  .config-resource-card,
  .config-resource-card::before {
    transition-duration: 0.01ms !important;
  }
}
</style>
