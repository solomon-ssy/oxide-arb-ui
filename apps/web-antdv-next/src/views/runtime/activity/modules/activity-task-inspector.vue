<script lang="ts" setup>
import type {
  RuntimeActivityActionKind,
  RuntimeActivityView,
} from '@vben/types';

import type {
  ObjectInspectorAction,
  ObjectInspectorSectionModel,
} from '#/shared/components/object-inspector/object-inspector.types';

import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { Button, Progress } from 'antdv-next';

import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import ObjectInspectorActions from '#/shared/components/object-inspector/object-inspector-actions.vue';
import ObjectInspectorHeader from '#/shared/components/object-inspector/object-inspector-header.vue';
import ObjectInspectorSection from '#/shared/components/object-inspector/object-inspector-section.vue';
import WorkspaceInspectorSurface from '#/shared/components/workspace/workspace-inspector-surface.vue';

defineOptions({ name: 'ActivityTaskInspector' });

const props = defineProps<{
  item: null | RuntimeActivityView;
}>();
const emit = defineEmits<{
  action: [kind: RuntimeActivityActionKind, item: RuntimeActivityView];
  close: [];
}>();

const openModel = defineModel<boolean>('open', { default: false });
const router = useRouter();

const title = computed(() =>
  props.item
    ? $t(`page.runtimeActivity.kind.${props.item.entity.kind}`)
    : $t('page.runtimeActivity.taskDetail'),
);
const progressPct = computed(() => {
  const raw = props.item?.progress_pct;
  if (typeof raw !== 'number') {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(raw)));
});
const section = computed((): ObjectInspectorSectionModel => {
  const item = props.item;
  const related = item?.related_entity
    ? `${item.related_entity.kind} · ${item.related_entity.id}`
    : undefined;
  return {
    fields: [
      {
        label: $t('page.runtimeActivity.inspector.entity'),
        mono: true,
        value: item ? `${item.entity.kind} · ${item.entity.id}` : undefined,
      },
      {
        label: $t('page.runtimeActivity.inspector.related'),
        mono: true,
        value: related,
      },
      {
        label: $t('page.runtimeActivity.inspector.sourceStatus'),
        value: item?.source_status || undefined,
      },
      {
        label: $t('page.runtimeActivity.inspector.startedAt'),
        value: formatDateTimeLocal(item?.started_at),
      },
      {
        label: $t('page.runtimeActivity.inspector.finishedAt'),
        value: formatDateTimeLocal(item?.finished_at),
      },
      {
        label: $t('page.runtimeActivity.inspector.updatedAt'),
        value: formatDateTimeLocal(item?.updated_at),
      },
      {
        label: $t('page.runtimeActivity.inspector.detail'),
        value: item?.detail || undefined,
      },
    ],
    key: 'task',
    title: $t('page.runtimeActivity.taskDetail'),
  };
});
const actions = computed((): ObjectInspectorAction[] =>
  (props.item?.available_actions ?? []).map((action) => ({
    danger: action.kind === 'cancel_research_job',
    key: action.kind,
    label: $t(`page.runtimeActivity.action.${action.kind}`),
  })),
);

function openWorkspace() {
  const route = props.item?.target_route;
  if (route) {
    void router.push(route);
  }
}

function selectAction(action: ObjectInspectorAction) {
  if (!props.item) {
    return;
  }
  emit('action', action.key as RuntimeActivityActionKind, props.item);
}
</script>

<template>
  <WorkspaceInspectorSurface
    v-model:open="openModel"
    test-id="runtime-activity-inspector"
    :title="title"
    @close="emit('close')"
  >
    <template v-if="item?.target_route" #actions>
      <Button type="primary" @click="openWorkspace">
        {{ $t('page.runtimeActivity.openWorkspace') }}
      </Button>
    </template>
    <div v-if="item" class="flex flex-col gap-4">
      <ObjectInspectorHeader
        :entity-id="item.entity.id"
        :eyebrow="$t(`page.runtimeActivity.domain.${item.domain}`)"
        :statuses="[
          {
            context: 'runtime-activity',
            name: 'RuntimeActivityStatus',
            value: item.status,
          },
        ]"
      />

      <Progress
        v-if="progressPct !== null"
        :aria-label="$t('page.runtimeActivity.progress')"
        :percent="progressPct"
        :status="item.status === 'failed' ? 'exception' : undefined"
      />

      <ObjectInspectorSection :section="section" />
      <ObjectInspectorActions
        v-if="actions.length > 0"
        :actions="actions"
        @select="selectAction"
      />
    </div>
  </WorkspaceInspectorSurface>
</template>
