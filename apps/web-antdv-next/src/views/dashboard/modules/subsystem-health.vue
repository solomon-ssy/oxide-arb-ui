<script lang="ts" setup>
import type { DashboardDependencyCheck } from '@vben/types';

import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { $t } from '#/locales';

defineOptions({ name: 'SubsystemHealthList' });

const props = defineProps<{
  checks: DashboardDependencyCheck[];
  ready: boolean;
}>();

const CHECK_ICONS: Record<string, string> = {
  catalog: 'lucide:library',
  policy_generation: 'lucide:scale',
  postgresql: 'lucide:database',
  redis: 'lucide:layers',
};

const orderedChecks = computed(() =>
  [...props.checks].toSorted(
    (left, right) =>
      Number(left.ok) - Number(right.ok) || left.name.localeCompare(right.name),
  ),
);
const failedCount = computed(
  () => props.checks.filter((check) => !check.ok).length,
);
const readyCount = computed(() => props.checks.length - failedCount.value);

function checkLabel(name: string) {
  const key = `page.dashboard.health.subsystem.${name}`;
  const translated = $t(key);
  return translated === key ? name : translated;
}

function checkIcon(name: string) {
  return CHECK_ICONS[name] ?? 'lucide:server';
}

function showDetail(check: DashboardDependencyCheck) {
  if (!check.detail) return false;
  return !check.ok || check.detail.length < 96;
}
</script>

<template>
  <div class="health-board">
    <div class="health-summary" role="status">
      <span class="health-summary-copy">
        <strong>
          {{
            ready
              ? $t('page.dashboard.health.ready')
              : $t('page.dashboard.health.degraded')
          }}
        </strong>
        <small>
          {{
            $t('page.dashboard.health.counts', {
              ok: readyCount,
              total: checks.length,
            })
          }}
          <template v-if="!ready">
            ·
            {{
              $t('page.dashboard.health.failedCount', { count: failedCount })
            }}
          </template>
        </small>
      </span>
      <span class="health-tag" :data-ok="ready ? 'true' : 'false'">
        <IconifyIcon
          :icon="ready ? 'lucide:circle-check' : 'lucide:circle-x'"
        />
        {{
          ready
            ? $t('page.dashboard.health.ok')
            : $t('page.dashboard.health.failed')
        }}
      </span>
    </div>

    <ul class="health-check-list">
      <li
        v-for="check in orderedChecks"
        :key="check.name"
        class="health-check"
        :data-ok="check.ok ? 'true' : 'false'"
        :title="check.detail"
      >
        <span class="health-check-icon" aria-hidden="true">
          <IconifyIcon :icon="checkIcon(check.name)" />
        </span>
        <span class="health-check-copy">
          <strong>{{ checkLabel(check.name) }}</strong>
          <small v-if="showDetail(check)" :title="check.detail">
            {{ check.detail }}
          </small>
        </span>
        <span class="health-tag" :data-ok="check.ok ? 'true' : 'false'">
          <IconifyIcon
            :icon="check.ok ? 'lucide:circle-check' : 'lucide:circle-x'"
          />
          {{
            check.ok
              ? $t('page.dashboard.health.ok')
              : $t('page.dashboard.health.failed')
          }}
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.health-board {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 10px;
}

.health-summary,
.health-check {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.health-summary {
  padding: 2px 2px 8px;
  border-bottom: 1px solid hsl(var(--qp-border-subtle));
}

.health-summary-copy,
.health-check-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.health-summary-copy strong,
.health-check-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 650;
  color: hsl(var(--qp-text-primary));
  white-space: nowrap;
}

.health-summary-copy strong {
  font-size: 13px;
}

.health-summary-copy small,
.health-check-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  color: hsl(var(--qp-text-muted));
  white-space: nowrap;
}

.health-check-copy small {
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 10px;
}

.health-check-list {
  display: grid;
  gap: 6px;
}

.health-check {
  grid-template-columns: 28px minmax(0, 1fr) auto;
  padding: 8px 10px;
  background: hsl(var(--qp-surface-inset));
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: var(--qp-radius-md);
}

.health-check[data-ok='false'] {
  border-color: hsl(var(--qp-status-danger) / 38%);
}

.health-check-icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  color: hsl(var(--qp-text-muted));
  background: hsl(var(--qp-surface-raised));
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: var(--qp-radius-md);
}

.health-check[data-ok='false'] .health-check-icon {
  color: hsl(var(--qp-status-danger));
  background: hsl(var(--qp-status-danger) / 12%);
  border-color: hsl(var(--qp-status-danger) / 32%);
}

.health-check[data-ok='false'] .health-check-copy small {
  color: hsl(var(--qp-status-danger));
}

.health-tag {
  display: inline-flex;
  flex: none;
  gap: 4px;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 650;
  line-height: 1;
  border: 1px solid;
  border-radius: 999px;
}

.health-tag :deep(svg) {
  width: 12px;
  height: 12px;
}

.health-tag[data-ok='true'] {
  color: hsl(var(--qp-status-success));
  background: hsl(var(--qp-status-success-soft));
  border-color: hsl(var(--qp-status-success) / 48%);
}

.health-tag[data-ok='false'] {
  color: hsl(var(--qp-status-danger));
  background: hsl(var(--qp-status-danger-soft));
  border-color: hsl(var(--qp-status-danger) / 55%);
}
</style>
