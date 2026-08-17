<script lang="ts" setup>
import { IconifyIcon } from '@vben/icons';

defineOptions({ name: 'InsightPanel' });

withDefaults(
  defineProps<{
    featured?: boolean;
    fill?: boolean;
    gap?: 'md' | 'sm';
    icon?: string;
    title: string;
    tone?: InsightTone;
  }>(),
  {
    featured: false,
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
    :data-featured="featured ? 'true' : undefined"
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
    <div class="panel-body" :class="{ 'panel-body-fill': fill }">
      <slot></slot>
    </div>
  </section>
</template>

<style scoped>
.insight-panel {
  --panel-accent: var(--qp-accent-command);
  --panel-feature-gradient: var(--qp-gradient-governance);

  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: var(--qp-density-card-padding);
  background: hsl(var(--qp-surface-raised));
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: var(--qp-radius-lg);
}

.insight-panel[data-featured='true'] {
  background:
    radial-gradient(
        circle at 4% 0%,
        hsl(var(--panel-accent) / 9%),
        transparent 38%
      )
      padding-box,
    linear-gradient(
        hsl(var(--qp-surface-raised) / 98%),
        hsl(var(--qp-surface-raised) / 98%)
      )
      padding-box,
    var(--panel-feature-gradient) border-box;
  border-color: transparent;
  box-shadow: var(--qp-shadow-featured);
}

.insight-panel[data-featured='true'] .panel-icon {
  color: white;
  background: var(--panel-feature-gradient);
  box-shadow: var(--qp-shadow-featured);
}

.insight-panel[data-featured='true'][data-tone='cyan'],
.insight-panel[data-featured='true'][data-tone='sky'],
.insight-panel[data-featured='true'][data-tone='cyan'] .panel-icon,
.insight-panel[data-featured='true'][data-tone='sky'] .panel-icon {
  box-shadow: var(--qp-shadow-featured-sky);
}

.insight-panel[data-featured='true'][data-tone='violet'],
.insight-panel[data-featured='true'][data-tone='violet'] .panel-icon {
  box-shadow: var(--qp-shadow-featured-pink);
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

.insight-panel.h-full {
  overflow: hidden;
}

.panel-body-fill {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-body-fill :slotted(.panel-empty) {
  display: grid;
  flex: 1 1 auto;
  place-items: center;
  width: 100%;
  min-height: 12rem;
}

[data-tone='amber'] {
  --panel-accent: var(--qp-status-warning);
}

[data-tone='cyan'],
[data-tone='sky'] {
  --panel-accent: var(--qp-accent-realtime);
  --panel-feature-gradient: var(--qp-gradient-trading);
}

[data-tone='teal'] {
  --panel-accent: var(--qp-status-success);
}

[data-tone='violet'] {
  --panel-accent: var(--qp-accent-research);
  --panel-feature-gradient: var(--qp-gradient-execution);
}
</style>
