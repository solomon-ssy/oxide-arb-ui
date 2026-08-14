<script lang="ts" setup>
import { IconifyIcon } from '@vben/icons';

defineOptions({ name: 'InsightPanel' });

withDefaults(
  defineProps<{
    fill?: boolean;
    gap?: 'md' | 'sm';
    icon?: string;
    title: string;
    tone?: InsightTone;
  }>(),
  {
    fill: false,
    gap: 'md',
    icon: undefined,
    tone: 'indigo',
  },
);

export type InsightTone =
  | 'amber'
  | 'cyan'
  | 'indigo'
  | 'sky'
  | 'teal'
  | 'violet';
</script>

<template>
  <section
    :class="{ 'h-full': fill, 'panel-gap-sm': gap === 'sm' }"
    :data-tone="tone"
    class="insight-panel"
  >
    <header class="panel-header">
      <div class="panel-title">
        <span v-if="icon" class="panel-icon" aria-hidden="true">
          <IconifyIcon :icon="icon" />
        </span>
        <h2>{{ title }}</h2>
      </div>
      <div v-if="$slots.extra" class="panel-extra">
        <slot name="extra"></slot>
      </div>
    </header>
    <div class="panel-body"><slot></slot></div>
  </section>
</template>

<style scoped>
.insight-panel {
  --panel-accent: var(--qp-accent-command);

  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: var(--qp-density-card-padding);
  background: hsl(var(--qp-surface-raised));
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: var(--qp-radius-lg);
}

.panel-gap-sm {
  gap: 8px;
}

.panel-header,
.panel-title {
  display: flex;
  align-items: center;
}

.panel-header {
  flex: none;
  gap: 12px;
  justify-content: space-between;
  min-width: 0;
}

.panel-title {
  gap: 9px;
  min-width: 0;
}

.panel-title h2 {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 680;
  color: hsl(var(--qp-text-primary));
  white-space: nowrap;
}

.panel-icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 30px;
  height: 30px;
  color: hsl(var(--panel-accent));
  background: hsl(var(--panel-accent) / 10%);
  border-radius: var(--qp-radius-md);
}

.panel-extra {
  flex: none;
  color: hsl(var(--qp-accent-command));
}

.panel-body {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

[data-tone='amber'] {
  --panel-accent: var(--qp-status-warning);
}

[data-tone='cyan'],
[data-tone='sky'] {
  --panel-accent: var(--qp-accent-realtime);
}

[data-tone='teal'] {
  --panel-accent: var(--qp-status-success);
}

[data-tone='violet'] {
  --panel-accent: var(--qp-accent-research);
}
</style>
