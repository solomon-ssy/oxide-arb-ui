<script lang="ts" setup>
import type {
  RuntimeActivityActionKind,
  RuntimeActivityDomain,
  RuntimeActivityStatus,
  RuntimeActivityView,
} from '@vben/types';

import { computed, h } from 'vue';
import { RouterLink } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import { Button, Empty, Listy, Progress, Skeleton, Tag } from 'antdv-next';
import { motion, useReducedMotion } from 'motion-v';

import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';

defineOptions({ name: 'RuntimeActivityFeed' });

const props = withDefaults(
  defineProps<{
    height?: number;
    items: RuntimeActivityView[];
    loading?: boolean;
    showActions?: boolean;
  }>(),
  {
    height: 560,
    loading: false,
    showActions: false,
  },
);

const emit = defineEmits<{
  action: [kind: RuntimeActivityActionKind, item: RuntimeActivityView];
}>();

const reducedMotion = useReducedMotion();

const STATUS_ICON: Record<RuntimeActivityStatus, string> = {
  attention: 'lucide:triangle-alert',
  cancelled: 'lucide:circle-slash-2',
  failed: 'lucide:circle-x',
  pending: 'lucide:clock-3',
  running: 'lucide:loader-circle',
  skipped: 'lucide:skip-forward',
  succeeded: 'lucide:circle-check',
};

const STATUS_CLASS: Record<RuntimeActivityStatus, string> = {
  attention: 'is-attention',
  cancelled: 'is-neutral',
  failed: 'is-danger',
  pending: 'is-queued',
  running: 'is-running',
  skipped: 'is-warning',
  succeeded: 'is-success',
};

const DOMAIN_ICON: Record<RuntimeActivityDomain, string> = {
  execution: 'lucide:route',
  reconciliation: 'lucide:git-compare-arrows',
  report: 'lucide:file-chart-column',
  research: 'lucide:flask-conical',
  settlement: 'lucide:landmark',
};

const group = {
  key: (item: RuntimeActivityView) => dayKey(item.updated_at),
  title: (key: number | string) =>
    h('span', { class: 'qp-activity-group-label' }, dayLabel(String(key))),
};

const hasItems = computed(() => props.items.length > 0);

function dayKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'unknown';
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dayLabel(key: string) {
  if (key === 'unknown') {
    return $t('page.runtimeActivity.unknownDate');
  }
  const today = dayKey(new Date().toISOString());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === today) {
    return $t('page.runtimeActivity.today');
  }
  if (key === dayKey(yesterday.toISOString())) {
    return $t('page.runtimeActivity.yesterday');
  }
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${key}T00:00:00`));
}

function actionLabel(kind: RuntimeActivityActionKind) {
  return $t(`page.runtimeActivity.action.${kind}`);
}

function activityKind(item: RuntimeActivityView) {
  return $t(`page.runtimeActivity.kind.${item.entity.kind}`);
}

function progress(item: RuntimeActivityView) {
  if (item.progress_pct === null) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(item.progress_pct)));
}

function statusClass(item: RuntimeActivityView) {
  return STATUS_CLASS[item.status];
}

function statusIcon(item: RuntimeActivityView) {
  return STATUS_ICON[item.status];
}

function domainIcon(item: RuntimeActivityView) {
  return DOMAIN_ICON[item.domain];
}
</script>

<template>
  <div class="activity-feed" :aria-busy="loading">
    <div v-if="loading && !hasItems" class="activity-loading">
      <Skeleton
        v-for="index in 5"
        :key="index"
        active
        :paragraph="{ rows: 2 }"
      />
    </div>
    <Empty
      v-else-if="!hasItems"
      :description="$t('page.runtimeActivity.empty')"
      class="activity-empty"
    />
    <Listy
      v-else
      :group="group"
      :height="height"
      :items="items"
      :row-key="(item: RuntimeActivityView) => item.activity_id"
      root-class="qp-activity-list"
      sticky
      virtual
    >
      <template #itemRender="item">
        <motion.div
          :animate="reducedMotion ? undefined : { opacity: 1, y: 0 }"
          class="activity-row"
          :class="[
            statusClass(item),
            { 'qp-running-motion': item.status === 'running' },
          ]"
          :initial="reducedMotion ? false : { opacity: 0, y: 8 }"
          :layout="!reducedMotion"
          :transition="{ duration: reducedMotion ? 0 : 0.3 }"
        >
          <span class="status-rail" aria-hidden="true"></span>
          <span class="activity-icon" :class="statusClass(item)">
            <IconifyIcon
              :class="{ 'motion-safe:animate-spin': item.status === 'running' }"
              :icon="statusIcon(item)"
            />
          </span>
          <div class="activity-body">
            <div class="activity-heading">
              <RouterLink class="activity-title" :to="item.target_route">
                {{ activityKind(item) }}
              </RouterLink>
              <time :datetime="item.updated_at" class="activity-time">
                {{ formatDateTimeLocal(item.updated_at) }}
              </time>
            </div>
            <div class="activity-meta">
              <Tag class="domain-tag">
                <IconifyIcon :icon="domainIcon(item)" />
                {{ $t(`page.runtimeActivity.domain.${item.domain}`) }}
              </Tag>
              <Tag class="status-tag" :class="[statusClass(item)]">
                {{ $t(`page.runtimeActivity.status.${item.status}`) }}
              </Tag>
              <code>{{ item.source_status }}</code>
            </div>
            <Progress
              v-if="item.progress_pct !== null"
              :aria-label="$t('page.runtimeActivity.progress')"
              class="activity-progress"
              :percent="progress(item)"
              size="small"
              status="active"
            />
            <p v-if="item.detail" class="activity-detail">{{ item.detail }}</p>
            <div
              v-if="showActions && item.available_actions.length > 0"
              class="activity-actions"
            >
              <Button
                v-for="action in item.available_actions"
                :key="action.kind"
                size="small"
                :danger="action.kind === 'cancel_research_job'"
                @click="emit('action', action.kind, item)"
              >
                {{ actionLabel(action.kind) }}
              </Button>
            </div>
          </div>
        </motion.div>
      </template>
    </Listy>
    <div v-if="loading && hasItems" class="activity-refreshing" role="status">
      <IconifyIcon class="animate-spin" icon="lucide:loader-circle" />
      {{ $t('page.runtimeActivity.refreshing') }}
    </div>
  </div>
</template>

<style scoped>
.activity-feed {
  position: relative;
  min-width: 0;
}

.activity-loading {
  display: grid;
  gap: var(--qp-density-section-gap);
  padding: var(--qp-density-card-padding);
}

.activity-empty {
  padding-block: 64px;
}

:deep(.qp-activity-list) {
  background: transparent;
}

:deep(.qp-activity-list .ant-listy-group-header) {
  z-index: var(--qp-layer-sticky);
  padding: 9px 14px;
  background: hsl(var(--qp-surface-overlay) / 88%);
  border-block: 1px solid hsl(var(--qp-border-subtle));
  backdrop-filter: blur(18px);
}

:deep(.qp-activity-group-label) {
  font-size: 11px;
  font-weight: 700;
  color: hsl(var(--qp-text-muted));
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

:deep(.qp-activity-list .ant-listy-item) {
  padding: 0;
}

.activity-row {
  position: relative;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 12px;
  min-height: 96px;
  padding: 14px 16px 14px 18px;
  background: hsl(var(--qp-surface-overlay) / 62%);
  border-bottom: 1px solid hsl(var(--qp-border-subtle));
  transition:
    background-color var(--qp-motion-instant) var(--qp-motion-ease-out),
    transform var(--qp-motion-instant) var(--qp-motion-ease-out);
}

.activity-row:hover {
  background: hsl(var(--qp-surface-raised) / 90%);
}

.status-rail {
  position: absolute;
  inset-block: 14px;
  inset-inline-start: 0;
  width: 2px;
  background: hsl(var(--qp-status-neutral));
  border-radius: var(--qp-radius-sm);
}

.activity-row.is-success .status-rail {
  background: hsl(var(--qp-status-success));
}

.activity-row.is-running .status-rail {
  background: hsl(var(--qp-status-running));
  box-shadow: var(--qp-glow-realtime);
}

.activity-row.is-queued .status-rail {
  background: hsl(var(--qp-status-queued));
}

.activity-row.is-warning .status-rail,
.activity-row.is-attention .status-rail {
  background: hsl(var(--qp-status-warning));
}

.activity-row.is-danger .status-rail {
  background: hsl(var(--qp-status-danger));
}

.activity-icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: hsl(var(--qp-status-neutral));
  background: hsl(var(--qp-status-neutral-soft));
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: var(--qp-radius-md);
}

.activity-icon.is-success {
  color: hsl(var(--qp-status-success));
  background: hsl(var(--qp-status-success-soft));
}

.activity-icon.is-running {
  color: hsl(var(--qp-status-running));
  background: hsl(var(--qp-status-running-soft));
}

.activity-icon.is-queued {
  color: hsl(var(--qp-status-queued));
  background: hsl(var(--qp-status-queued-soft));
}

.activity-icon.is-warning,
.activity-icon.is-attention {
  color: hsl(var(--qp-status-warning));
  background: hsl(var(--qp-status-warning-soft));
}

.activity-icon.is-danger {
  color: hsl(var(--qp-status-danger));
  background: hsl(var(--qp-status-danger-soft));
}

.activity-body {
  min-width: 0;
}

.activity-heading {
  display: flex;
  gap: 12px;
  align-items: baseline;
  justify-content: space-between;
}

.activity-title {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 650;
  color: hsl(var(--qp-text-primary));
  white-space: nowrap;
}

.activity-title:hover {
  color: hsl(var(--qp-accent-realtime));
}

.activity-time {
  flex: none;
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 10px;
  color: hsl(var(--qp-text-secondary));
}

.activity-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-top: 8px;
}

.activity-meta code {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 10px;
  color: hsl(var(--qp-text-secondary));
  white-space: nowrap;
}

.domain-tag {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.status-tag.is-success {
  color: hsl(var(--qp-status-success));
  background: hsl(var(--qp-status-success-soft));
}

.status-tag.is-running {
  color: hsl(var(--qp-status-running));
  background: hsl(var(--qp-status-running-soft));
}

.status-tag.is-queued {
  color: hsl(var(--qp-status-queued));
  background: hsl(var(--qp-status-queued-soft));
}

.status-tag.is-warning,
.status-tag.is-attention {
  color: hsl(var(--qp-status-warning));
  background: hsl(var(--qp-status-warning-soft));
}

.status-tag.is-danger {
  color: hsl(var(--qp-status-danger));
  background: hsl(var(--qp-status-danger-soft));
}

.activity-progress {
  margin-top: 8px;
}

.activity-detail {
  display: -webkit-box;
  margin-top: 8px;
  overflow: hidden;
  -webkit-line-clamp: 2;
  font-size: 12px;
  color: hsl(var(--qp-status-danger));
  -webkit-box-orient: vertical;
}

.activity-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

:deep(.activity-actions .ant-btn-dangerous.ant-btn-variant-outlined) {
  color: hsl(var(--qp-status-danger));
  border-color: hsl(var(--qp-status-danger) / 72%);
}

:deep(.activity-actions .ant-btn-dangerous.ant-btn-variant-outlined:hover) {
  color: hsl(var(--qp-status-danger));
  border-color: hsl(var(--qp-status-danger));
}

.activity-refreshing {
  position: absolute;
  inset-block-start: 10px;
  inset-inline-end: 12px;
  z-index: var(--qp-layer-sticky);
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 6px 9px;
  font-size: 11px;
  color: hsl(var(--qp-text-secondary));
  background: hsl(var(--qp-surface-overlay) / 88%);
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: var(--qp-radius-md);
  box-shadow: var(--qp-shadow-low);
  backdrop-filter: blur(18px);
}
</style>
