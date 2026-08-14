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

import { VueFlow } from '@vue-flow/core';
import { Alert, Button, Skeleton } from 'antdv-next';

import { $t } from '#/locales';
import InsightPanel from '#/shared/components/insight-panel.vue';
import {
  ObjectInspectorActions,
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
const { animated, error, load, loading, runningJobs, stages } =
  useResearchLineage();

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
            animated: animated.value,
            id: `${stage.key}-${target.key}`,
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
      accent="violet"
      :description="$t('page.research.lineage.description')"
      icon="lucide:workflow"
      :title="$t('page.research.lineage.title')"
    >
      <template #actions>
        <Button :loading="loading" size="small" @click="load">
          <IconifyIcon class="mr-1 size-4" icon="lucide:refresh-cw" />
          {{ $t('page.research.lineage.refresh') }}
        </Button>
      </template>

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
      <div v-else class="lineage-canvas">
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
    <template v-if="selectedStage">
      <ObjectInspectorHeader
        :entity-id="selectedStage.entityId"
        :eyebrow="$t('page.research.lineage.inspector.eyebrow')"
        :title="$t(selectedStage.labelKey)"
      />
      <ObjectInspectorSection
        v-for="section in inspectorSections"
        :key="section.key"
        :section="section"
      />
      <ObjectInspectorTimeline :items="inspectorTimeline" />
      <ObjectInspectorActions
        :actions="[
          {
            icon: 'lucide:arrow-up-right',
            key: 'open-workspace',
            label: $t('page.research.lineage.inspector.openWorkspace'),
            primary: true,
          },
        ]"
        @select="openOwningWorkspace"
      />
    </template>
  </WorkspaceInspectorSurface>
</template>

<style scoped>
.lineage-workspace {
  min-height: 520px;
  padding: 4px;
}

.lineage-canvas {
  height: 390px;
  overflow: hidden;
  background: hsl(var(--qp-surface-sunken));
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: var(--qp-radius-lg);
}

@media (width < 768px) {
  .lineage-canvas {
    height: 680px;
  }
}

.lineage-node {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 174px;
  padding: 14px;
  color: hsl(var(--qp-text-primary));
  text-align: left;
  cursor: pointer;
  background: hsl(var(--qp-surface-raised));
  border: 1px solid hsl(var(--qp-chart-cat-4) / 58%);
  border-radius: var(--qp-radius-md);
  box-shadow: var(--qp-shadow-subtle);
}

.lineage-node:hover,
.lineage-node:focus-visible {
  outline: none;
  border-color: hsl(var(--qp-chart-cat-4));
  box-shadow: var(--qp-shadow-focus);
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

:deep(.vue-flow__edge.animated path) {
  stroke: hsl(var(--qp-accent-realtime));
}

:deep(.vue-flow__edge-path) {
  stroke: hsl(var(--qp-border-strong));
  stroke-width: 1.5;
}

:deep(.vue-flow__node) {
  padding: 0;
  background: none;
  border: 0;
}
</style>
