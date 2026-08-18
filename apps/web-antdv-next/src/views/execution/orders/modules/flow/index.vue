<script lang="ts" setup>
import type { ExecutionFlowStage } from './use-execution-flow';

import type {
  ObjectInspectorSectionModel,
  ObjectInspectorTimelineItem,
} from '#/shared/components/object-inspector';

import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import { Alert, Button, Empty, Skeleton } from 'antdv-next';

import { $t } from '#/locales';
import EnumTag from '#/shared/components/enum-tag.vue';
import InsightPanel from '#/shared/components/insight-panel.vue';
import {
  ObjectInspectorHeader,
  ObjectInspectorSection,
  ObjectInspectorTimeline,
} from '#/shared/components/object-inspector';
import WorkspaceInspectorSurface from '#/shared/components/workspace/workspace-inspector-surface.vue';

import { useExecutionFlow } from './use-execution-flow';

defineOptions({ name: 'ExecutionFlowRail' });

const route = useRoute();
const router = useRouter();
const { load, loading, partialError, stages } = useExecutionFlow();

const selectedStage = computed(() => {
  const entity = Array.isArray(route.query.entity)
    ? route.query.entity[0]
    : route.query.entity;
  const id = Array.isArray(route.query.id) ? route.query.id[0] : route.query.id;
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
          label: $t('page.execution.flow.inspector.stage'),
          value: $t(stage.labelKey),
        },
        {
          enum: stage.status,
          label: $t('page.execution.flow.inspector.status'),
        },
        {
          label: $t('page.execution.flow.inspector.duration'),
          value: stage.duration,
        },
        {
          label: $t('page.execution.flow.inspector.scope'),
          value: $t(stage.scopeKey),
        },
        {
          label: $t('page.execution.flow.inspector.entity'),
          mono: true,
          span: 2,
          value: stage.entity,
        },
        {
          label: $t('page.execution.flow.inspector.entityId'),
          mono: true,
          span: 2,
          value: stage.entityId,
        },
      ],
      key: 'execution-stage',
      title: $t('page.execution.flow.inspector.identity'),
    },
  ];
});
const inspectorTimeline = computed<ObjectInspectorTimelineItem[]>(() => {
  const stage = selectedStage.value;
  if (!stage) return [];
  return [
    {
      description: $t(stage.scopeKey),
      key: stage.key,
      occurredAt: stage.occurredAt,
      status: stage.status,
      title: $t(stage.labelKey),
    },
  ];
});

function selectStage(stage: ExecutionFlowStage) {
  if (!stage.entityId) return;
  void router.push({
    query: {
      ...route.query,
      entity: stage.entity,
      id: stage.entityId,
      module: 'flow',
    },
  });
}

function openOwningLedger() {
  const stage = selectedStage.value;
  if (stage) void router.push(stage.route);
}
</script>

<template>
  <div class="execution-flow-workspace">
    <InsightPanel
      accent="cyan"
      :description="$t('page.execution.flow.description')"
      icon="lucide:git-branch"
      :title="$t('page.execution.flow.title')"
    >
      <template #actions>
        <Button :loading="loading" size="small" @click="load">
          <IconifyIcon class="mr-1 size-4" icon="lucide:refresh-cw" />
          {{ $t('page.execution.flow.refresh') }}
        </Button>
      </template>

      <Alert
        v-if="partialError"
        class="mb-3"
        :message="$t('page.execution.flow.partialError')"
        show-icon
        type="warning"
      />
      <Skeleton
        v-if="loading && stages.every((stage) => !stage.entityId)"
        active
      />
      <Empty
        v-else-if="stages.every((stage) => !stage.entityId)"
        :description="$t('page.execution.flow.empty')"
      />
      <ol v-else class="execution-flow-rail">
        <li
          v-for="(stage, index) in stages"
          :key="stage.key"
          class="execution-flow-stage"
        >
          <button
            :aria-label="
              $t('page.execution.flow.openStage', {
                stage: $t(stage.labelKey),
              })
            "
            class="execution-flow-stage-card"
            :disabled="!stage.entityId"
            type="button"
            @click="selectStage(stage)"
          >
            <span class="execution-flow-index">
              {{ String(index + 1).padStart(2, '0') }}
            </span>
            <span class="execution-flow-label">{{ $t(stage.labelKey) }}</span>
            <EnumTag
              context="execution-flow"
              :name="stage.status.name"
              :value="stage.status.value"
            />
            <span class="execution-flow-metric">
              <IconifyIcon icon="lucide:timer" />
              {{ stage.duration }}
            </span>
            <span class="execution-flow-scope">{{ $t(stage.scopeKey) }}</span>
            <span class="execution-flow-count">
              {{ $t('page.execution.flow.records', { count: stage.count }) }}
            </span>
          </button>
          <span
            v-if="index < stages.length - 1"
            aria-hidden="true"
            class="execution-flow-connector"
            :class="[{ 'qp-scan-motion': stage.active }]"
          >
            <IconifyIcon icon="lucide:chevron-right" />
          </span>
        </li>
      </ol>
      <p class="execution-flow-footnote">
        {{ $t('page.execution.flow.authorityNote') }}
      </p>
    </InsightPanel>
  </div>

  <WorkspaceInspectorSurface
    v-model:open="inspectorOpen"
    :title="
      selectedStage
        ? $t(selectedStage.labelKey)
        : $t('page.execution.flow.inspector.title')
    "
  >
    <template v-if="selectedStage" #actions>
      <Button type="primary" @click="openOwningLedger">
        {{ $t('page.execution.flow.inspector.openLedger') }}
      </Button>
    </template>
    <template v-if="selectedStage">
      <ObjectInspectorHeader
        :entity-id="selectedStage.entityId"
        :eyebrow="$t('page.execution.flow.inspector.eyebrow')"
        :statuses="[selectedStage.status]"
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
.execution-flow-workspace {
  min-height: 460px;
  padding: 4px;
}

.execution-flow-rail {
  display: grid;
  grid-template-columns: repeat(8, minmax(150px, 1fr));
  padding: 4px 0 12px;
  margin: 0;
  overflow-x: auto;
  list-style: none;
}

.execution-flow-stage {
  display: flex;
  align-items: center;
  min-width: 0;
}

.execution-flow-stage-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  min-width: 142px;
  min-height: 180px;
  padding: 14px;
  color: hsl(var(--qp-text-primary));
  text-align: left;
  cursor: pointer;
  background: hsl(var(--qp-surface-raised));
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: var(--qp-radius-md);
  box-shadow: var(--qp-shadow-subtle);
  transition:
    transform var(--qp-motion-instant) var(--qp-motion-ease-out),
    border-color var(--qp-motion-instant) var(--qp-motion-ease-out);
}

.execution-flow-stage-card:hover:not(:disabled),
.execution-flow-stage-card:focus-visible:not(:disabled) {
  outline: none;
  border-color: hsl(var(--qp-accent-realtime));
  transform: translateY(-2px);
}

.execution-flow-stage-card:focus-visible:not(:disabled) {
  box-shadow: var(--qp-shadow-focus);
}

.execution-flow-stage-card:disabled {
  cursor: default;
  opacity: 0.55;
}

.execution-flow-index {
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 10px;
  color: hsl(var(--qp-accent-realtime));
}

.execution-flow-label {
  min-height: 36px;
  font-size: 13px;
  font-weight: 720;
  line-height: 1.35;
}

.execution-flow-metric {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 11px;
  color: hsl(var(--qp-text-secondary));
}

.execution-flow-scope,
.execution-flow-count,
.execution-flow-footnote {
  font-size: 10px;
  line-height: 1.45;
  color: hsl(var(--qp-text-muted));
}

.execution-flow-count {
  margin-top: auto;
}

.execution-flow-connector {
  position: relative;
  display: grid;
  flex: 0 0 24px;
  place-items: center;
  height: 36px;
  overflow: hidden;
  color: hsl(var(--qp-border-strong));
}

.execution-flow-connector.qp-scan-motion {
  color: hsl(var(--qp-accent-realtime));
}

.execution-flow-footnote {
  margin: 8px 0 0;
}

@media (max-width: 768px) {
  .execution-flow-rail {
    grid-template-columns: repeat(8, minmax(132px, 1fr));
  }

  .execution-flow-stage-card {
    min-width: 124px;
    padding: 12px;
  }
}
</style>
