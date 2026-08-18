<script lang="ts" setup>
import type { Edge, Node, NodeMouseEvent } from '@vue-flow/core';

import type { ResearchLineageStage } from './use-research-lineage';

import type {
  ObjectInspectorSectionModel,
  ObjectInspectorTimelineItem,
} from '#/shared/components/object-inspector';

import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';
import { usePreferences } from '@vben/preferences';

import { MarkerType, VueFlow } from '@vue-flow/core';
import { usePreferredReducedMotion } from '@vueuse/core';
import { Alert, Button, Skeleton } from 'antdv-next';

import { $t } from '#/locales';
import InsightPanel from '#/shared/components/insight-panel.vue';
import {
  ObjectInspectorHeader,
  ObjectInspectorSection,
  ObjectInspectorTimeline,
} from '#/shared/components/object-inspector';
import WorkspaceInspectorSurface from '#/shared/components/workspace/workspace-inspector-surface.vue';

import { useResearchLineage } from './use-research-lineage';

import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';

defineOptions({ name: 'ResearchLineageGraph' });

const router = useRouter();
const route = useRoute();
const { isMobile } = usePreferences();
const reducedMotion = usePreferredReducedMotion();
const { error, live, load, loading, runningJobs, stages } =
  useResearchLineage();
const quietMotion = computed(
  () =>
    reducedMotion.value === 'reduce' ||
    document.documentElement.dataset.uiDeterministic === 'true',
);
const flowing = computed(() => !quietMotion.value);

const nodes = computed<Node<ResearchLineageStage>[]>(() =>
  stages.value.map((stage, index) => ({
    data: stage,
    draggable: false,
    id: stage.key,
    position: isMobile.value
      ? { x: 68, y: 20 + index * 108 }
      : { x: index * 210, y: index % 2 === 0 ? 34 : 126 },
    selectable: true,
    type: 'default',
  })),
);
const edges = computed<Edge[]>(() =>
  stages.value.slice(0, -1).flatMap((stage, index) => {
    const target = stages.value[index + 1];
    return target
      ? [
          {
            animated: flowing.value,
            id: `${stage.key}-${target.key}`,
            markerEnd: MarkerType.ArrowClosed,
            source: stage.key,
            target: target.key,
            type: 'smoothstep',
          },
        ]
      : [];
  }),
);

const selectedStage = computed(() => {
  const entity = Array.isArray(route.query.entity)
    ? route.query.entity[0]
    : route.query.entity;
  const id = Array.isArray(route.query.id) ? route.query.id[0] : route.query.id;

  if (typeof entity !== 'string' || typeof id !== 'string' || !entity || !id) {
    return undefined;
  }

  return stages.value.find(
    (stage) => stage.entity === entity && stage.entityId === id,
  );
});
const inspectorOpen = computed({
  get: () => selectedStage.value !== undefined,
  set: (value: boolean) => {
    if (value) return;
    const { entity: _entity, id: _id, ...query } = route.query;
    void router.push({ query });
  },
});
const inspectorSections = computed<ObjectInspectorSectionModel[]>(() => {
  const stage = selectedStage.value;
  if (!stage) return [];
  return [
    {
      fields: [
        {
          label: $t('page.research.lineage.inspector.stage'),
          value: $t(stage.labelKey),
        },
        {
          label: $t('page.research.lineage.inspector.count'),
          value: stage.count,
        },
        {
          label: $t('page.research.lineage.inspector.entity'),
          mono: true,
          span: 2,
          value: stage.entity,
        },
        {
          label: $t('page.research.lineage.inspector.entityId'),
          mono: true,
          span: 2,
          value: stage.entityId,
        },
      ],
      key: 'lineage-stage',
      title: $t('page.research.lineage.inspector.snapshot'),
    },
  ];
});
const inspectorTimeline = computed<ObjectInspectorTimelineItem[]>(() => {
  const stage = selectedStage.value;
  if (!stage) return [];
  return [
    {
      description: $t('page.research.lineage.inspector.latest'),
      key: stage.key,
      occurredAt: stage.occurredAt,
      title: $t(stage.labelKey),
    },
  ];
});

function stageIndex(key: ResearchLineageStage['key']) {
  return Math.max(
    0,
    stages.value.findIndex((stage) => stage.key === key),
  );
}

function openStage(event: NodeMouseEvent) {
  const stage = event.node.data as ResearchLineageStage;
  if (!stage.entity || !stage.entityId) return;

  const query: Record<string, string> = {
    entity: stage.entity,
    id: stage.entityId,
    module: 'lineage',
  };
  void router.push({ path: stage.workspace, query });
}

function openOwningWorkspace() {
  const stage = selectedStage.value;
  if (!stage) return;
  const query: Record<string, string> = { module: stage.module };
  if (stage.entity && stage.entityId) {
    query.entity = stage.entity;
    query.id = stage.entityId;
  }
  void router.push({ path: stage.workspace, query });
}
</script>

<template>
  <div class="lineage-workspace">
    <InsightPanel
      featured
      icon="lucide:workflow"
      :title="$t('page.research.lineage.title')"
      tone="violet"
    >
      <template #extra>
        <Button :loading="loading" size="small" @click="load">
          <IconifyIcon class="mr-1 size-4" icon="lucide:refresh-cw" />
          {{ $t('page.research.lineage.refresh') }}
        </Button>
      </template>

      <p class="lineage-lede">
        {{ $t('page.research.lineage.description') }}
      </p>
      <Alert
        v-if="error"
        :message="$t('page.research.lineage.partialError')"
        show-icon
        type="warning"
      />
      <Skeleton
        v-if="loading && stages.every((stage) => stage.count === 0)"
        active
      />
      <div
        v-else
        class="lineage-canvas"
        :class="{
          'is-flowing': flowing,
          'is-live': live,
          'is-quiet': quietMotion,
        }"
      >
        <VueFlow
          :edges="edges"
          :fit-view-on-init="true"
          :max-zoom="1.25"
          :min-zoom="0.55"
          :nodes="nodes"
          :nodes-connectable="false"
          :nodes-draggable="false"
          @node-click="openStage"
        >
          <template #node-default="{ data }">
            <button
              class="lineage-node"
              :disabled="!data.entity || !data.entityId"
              :style="{ '--lineage-index': stageIndex(data.key) }"
              type="button"
            >
              <span class="lineage-node-label">{{ $t(data.labelKey) }}</span>
              <span class="lineage-node-count">{{ data.count }}</span>
              <span class="lineage-node-action">
                {{ $t('page.research.lineage.openStage') }}
                <IconifyIcon icon="lucide:arrow-up-right" />
              </span>
            </button>
          </template>
        </VueFlow>
      </div>
      <p class="lineage-footnote">
        {{
          runningJobs > 0
            ? $t('page.research.lineage.running', { count: runningJobs })
            : $t('page.research.lineage.idle')
        }}
      </p>
    </InsightPanel>
  </div>

  <WorkspaceInspectorSurface
    v-model:open="inspectorOpen"
    :title="
      selectedStage
        ? $t(selectedStage.labelKey)
        : $t('page.research.lineage.inspector.title')
    "
  >
    <template v-if="selectedStage" #actions>
      <Button type="primary" @click="openOwningWorkspace">
        {{ $t('page.research.lineage.inspector.openWorkspace') }}
      </Button>
    </template>
    <template v-if="selectedStage">
      <ObjectInspectorHeader
        :entity-id="selectedStage.entityId"
        :eyebrow="$t('page.research.lineage.inspector.eyebrow')"
      />
      <ObjectInspectorSection
        v-for="section in inspectorSections"
        :key="section.key"
        :section="section"
      />
      <ObjectInspectorTimeline :items="inspectorTimeline" />
    </template>
  </WorkspaceInspectorSurface>
</template>

<style scoped>
.lineage-workspace {
  min-height: 520px;
  padding: 4px;
}

.lineage-lede {
  max-width: 72ch;
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.55;
  color: hsl(var(--qp-text-secondary));
}

.lineage-canvas {
  height: 390px;
  overflow: hidden;
  background:
    radial-gradient(
      ellipse at 12% 28%,
      hsl(var(--qp-accent-violet) / 16%),
      transparent 42%
    ),
    radial-gradient(
      ellipse at 88% 72%,
      hsl(var(--qp-accent-pink) / 12%),
      transparent 46%
    ),
    radial-gradient(hsl(var(--qp-border-subtle) / 70%) 1px, transparent 1px),
    hsl(var(--qp-surface-sunken));
  background-size:
    auto,
    auto,
    22px 22px,
    auto;
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: var(--qp-radius-lg);
}

.lineage-canvas.is-live {
  box-shadow: var(--qp-glow-realtime);
}

@media (width < 768px) {
  .lineage-canvas {
    height: 680px;
  }
}

.lineage-node {
  --lineage-index: 0;

  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 174px;
  padding: 14px;
  overflow: hidden;
  color: hsl(var(--qp-text-primary));
  text-align: left;
  cursor: pointer;
  background:
    linear-gradient(180deg, hsl(var(--qp-accent-pink) / 10%), transparent 42%),
    hsl(var(--qp-surface-raised) / 92%);
  border: 1px solid hsl(var(--qp-chart-cat-4) / 58%);
  border-radius: var(--qp-radius-md);
  box-shadow: var(--qp-shadow-featured-pink);
  animation:
    lineage-enter 520ms var(--qp-motion-ease-out) both,
    qp-status-pulse 4.2s var(--qp-motion-ease-out) infinite;
  animation-delay:
    calc(var(--lineage-index) * 90ms), calc(520ms + var(--lineage-index) * 90ms);
}

.lineage-node > * {
  position: relative;
  z-index: var(--qp-layer-raised);
}

.lineage-canvas.is-flowing .lineage-node::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background: var(--qp-gradient-scan);
  opacity: 0.18;
  animation: qp-scan 4.8s linear infinite;
  animation-delay: calc(var(--lineage-index) * 240ms);
}

.lineage-node:hover,
.lineage-node:focus-visible {
  outline: none;
  border-color: hsl(var(--qp-chart-cat-4));
  box-shadow: var(--qp-shadow-focus);
  transform: translateY(-2px);
}

.lineage-node-label {
  font-size: 12px;
  font-weight: 700;
}

.lineage-node-count {
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 24px;
  font-weight: 720;
  color: hsl(var(--qp-chart-cat-4));
  text-shadow: 0 0 18px hsl(var(--qp-accent-orange) / 45%);
}

.lineage-node-action {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 10px;
  color: hsl(var(--qp-text-muted));
}

.lineage-footnote {
  margin: 10px 0 0;
  font-size: 11px;
  color: hsl(var(--qp-text-muted));
}

:deep(.vue-flow__edge-path) {
  filter: drop-shadow(0 0 6px hsl(var(--qp-accent-violet) / 70%));
  stroke: hsl(var(--qp-accent-violet));
  stroke-width: 2;
}

.lineage-canvas.is-live :deep(.vue-flow__edge-path) {
  filter: drop-shadow(0 0 8px hsl(var(--qp-accent-realtime) / 80%));
  stroke: hsl(var(--qp-accent-realtime));
}

.lineage-canvas.is-flowing :deep(.vue-flow__edge.animated path) {
  stroke-dasharray: 5 12;
  animation: lineage-dash 1.15s linear infinite;
}

.lineage-canvas.is-live :deep(.vue-flow__edge.animated path) {
  animation-duration: 0.7s;
}

:deep(.vue-flow__edge .vue-flow__edge-path) {
  marker-end: url('#vue-flow__arrowclosed');
}

:deep(.vue-flow__arrowhead polyline),
:deep(.vue-flow__edge.animated .vue-flow__edge-interaction) {
  stroke: hsl(var(--qp-accent-violet));
}

:deep(.vue-flow__node) {
  padding: 0;
  background: none;
  border: 0;
}

@keyframes lineage-enter {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes lineage-dash {
  to {
    stroke-dashoffset: -48;
  }
}

.lineage-canvas.is-quiet .lineage-node,
.lineage-canvas.is-quiet .lineage-node::after,
.lineage-canvas.is-quiet :deep(.vue-flow__edge.animated path) {
  animation: none;
}
</style>
