<script setup lang="ts">
import type {
  RuntimeConfigDocument,
  RuntimeConfigPatch,
  RuntimeConfigSchemaView,
  SchemaSection,
} from '@vben/types';

import type { ConfigSectionMeta, RuntimeConfigApplyPayload } from './types';

import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { preferences } from '@vben/preferences';
import { useRequestHandler } from '@vben/request/qp';

import { Alert, Button, message, Segmented, Tag } from 'antdv-next';
import { Mode } from 'vanilla-jsoneditor';

import {
  activateRuntimeConfigVersion,
  createRuntimeConfigVersion,
  getCurrentRuntimeConfig,
  getRuntimeConfigSchema,
} from '#/api/runtime-config';
import { $t } from '#/locales';
import JsonEditorShell from '#/shared/components/json-editor/json-editor-shell.vue';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useSystemStore } from '#/store';

import ConfigSectionCard from './config-section-card.vue';
import RuntimeConfigSectionIcon from './fields/runtime-config-section-icon.vue';
import { editorHasUnsavedDraft } from './runtime-config-editor-reload';
import RuntimeConfigEditorSkeleton from './runtime-config-editor-skeleton.vue';
import {
  readStoredActiveSectionId,
  resolveInitialActiveSectionId,
  writeStoredActiveSectionId,
} from './runtime-config-section-state';
import RuntimeConfigTopSections from './runtime-config-top-sections.vue';
import {
  buildFieldIndex,
  cloneDocument,
  sectionShowsGovernanceCritical,
  topSections,
} from './schema-mapper';
import { resolveUiText } from './ui-text';

type EditBody =
  | { config_json: RuntimeConfigDocument }
  | { config_patch: RuntimeConfigPatch };

interface ReloadOptions {
  force?: boolean;
}

const emit = defineEmits<{
  changed: [];
  openVersion: [versionId: string];
}>();

const { governed } = useGovernedAction();
const { handleRequest } = useRequestHandler();
const { hasAccessByCodes } = useQpAccess();
const systemStore = useSystemStore();

const canApply =
  hasAccessByCodes(['runtime_config:create']) &&
  hasAccessByCodes(['runtime_config:activate']);

const loading = ref(false);
const initialLoadComplete = ref(false);
const mode = ref<'form' | 'json'>('form');
const schema = ref<RuntimeConfigSchemaView>({ fields: [], tree: [] });
const config = ref<RuntimeConfigDocument>({});
const advancedDoc = ref<RuntimeConfigDocument>({});
const success = ref('');
const partialFailureVersionId = ref<null | string>(null);
const pendingExternalReload = ref(false);
const suppressNextWsReload = ref(false);
const rootRef = ref<HTMLElement | null>(null);
const activeSectionKey = ref('');

const sectionMeta = reactive<Record<string, ConfigSectionMeta | undefined>>({});
const sectionCards = reactive<
  Record<string, InstanceType<typeof ConfigSectionCard> | null>
>({});

interface ConfirmDialogState {
  cancelText: string;
  content: string;
  okText: string;
  title: string;
}

const confirmDialog = ref<ConfirmDialogState | null>(null);
let confirmResolve: ((value: boolean) => void) | null = null;

const [ReloadConfirmModal, reloadConfirmModalApi] = useVbenModal({
  onCancel() {
    confirmResolve?.(false);
    confirmResolve = null;
    reloadConfirmModalApi.close();
  },
  onConfirm() {
    confirmResolve?.(true);
    confirmResolve = null;
    reloadConfirmModalApi.close();
  },
});

const modeOptions = computed(() => [
  { label: $t('page.runtimeConfig.editor.mode.form'), value: 'form' },
  { label: $t('page.runtimeConfig.editor.mode.json'), value: 'json' },
]);

const sections = computed(() => topSections(schema.value));
const fieldIndex = computed(() => buildFieldIndex(schema.value));
const locale = computed(() => preferences.app.locale);

const sectionGovernanceCritical = computed(() => {
  const flags: Record<string, boolean> = {};
  for (const section of sections.value) {
    flags[section.id] = sectionShowsGovernanceCritical(
      section,
      fieldIndex.value,
      config.value,
    );
  }
  return flags;
});

const hasUnsavedDraft = computed(() =>
  editorHasUnsavedDraft({
    advancedDoc: advancedDoc.value,
    baselineConfig: config.value,
    mode: mode.value,
    sectionMeta,
  }),
);

/** Header title from schema — must not depend on mounted section card meta. */
function sectionTitle(section: SchemaSection) {
  return resolveUiText(section.label, locale.value);
}

watch(
  sections,
  (next) => {
    activeSectionKey.value = resolveInitialActiveSectionId(next, [
      activeSectionKey.value,
      readStoredActiveSectionId(),
    ]);
  },
  { immediate: true },
);

watch(activeSectionKey, (next) => {
  if (next) {
    writeStoredActiveSectionId(next);
  }
});

function onSectionMeta(sectionId: string, meta: ConfigSectionMeta) {
  sectionMeta[sectionId] = meta;
}

function bindSectionCard(
  sectionId: string,
  instance: Element | null | { apply?: () => void; resetDraft?: () => void },
) {
  sectionCards[sectionId] = instance as InstanceType<
    typeof ConfigSectionCard
  > | null;
}

function confirmDiscardDraftsForReload(): Promise<boolean> {
  // A second caller (e.g. a WS-driven reload) while a dialog is already open
  // must not orphan the first caller's `await` — resolve it as cancelled.
  confirmResolve?.(false);
  confirmDialog.value = {
    cancelText: $t('common.cancel'),
    content: $t('page.runtimeConfig.editor.reloadLiveConfig.content'),
    okText: $t('page.runtimeConfig.editor.reloadLiveConfig.continue'),
    title: $t('page.runtimeConfig.editor.reloadLiveConfig.title'),
  };
  return new Promise((resolve) => {
    confirmResolve = resolve;
    reloadConfirmModalApi.open();
  });
}

async function reload(options: ReloadOptions = {}): Promise<boolean> {
  if (
    !options.force &&
    initialLoadComplete.value &&
    hasUnsavedDraft.value &&
    !(await confirmDiscardDraftsForReload())
  ) {
    pendingExternalReload.value = true;
    return false;
  }

  loading.value = true;
  pendingExternalReload.value = false;
  if (options.force) {
    success.value = '';
    partialFailureVersionId.value = null;
  }

  const loaded = await handleRequest(async () => {
    const [schemaView, current] = await Promise.all([
      getRuntimeConfigSchema(),
      getCurrentRuntimeConfig(),
    ]);
    return { config: current.config, schema: schemaView };
  });

  if (loaded) {
    schema.value = loaded.schema;
    config.value = loaded.config;
    advancedDoc.value = cloneDocument(loaded.config);
    initialLoadComplete.value = true;
  }

  loading.value = false;
  return Boolean(loaded);
}

async function onModeChange(next: number | string) {
  mode.value = next === 'json' ? 'json' : 'form';
  await nextTick();
  rootRef.value
    ?.closest('.ant-drawer-body')
    ?.scrollTo({ behavior: 'smooth', top: 0 });
}

async function createAndActivate(
  body: EditBody,
  danger: boolean,
  summary: string,
  title: string,
) {
  partialFailureVersionId.value = null;
  success.value = '';
  const result = await governed(
    async (ctx) => {
      const created = await createRuntimeConfigVersion(
        { ...body, reason: ctx.reason },
        ctx,
      );
      try {
        await activateRuntimeConfigVersion(
          created.runtime_config_version_id,
          { reason: ctx.reason },
          ctx,
        );
        return created;
      } catch (error_) {
        partialFailureVersionId.value = created.runtime_config_version_id;
        throw error_;
      }
    },
    { danger, summary, title },
  );
  emit('changed');
  if (result) {
    success.value = $t('page.runtimeConfig.editor.feedback.applied');
    suppressNextWsReload.value = true;
    await reload({ force: true });
    suppressNextWsReload.value = false;
  }
}

function applyPatch(payload: RuntimeConfigApplyPayload) {
  const summary = payload.diffs
    .map(
      (diff) =>
        `${diff.path}: ${JSON.stringify(diff.previous)} -> ${JSON.stringify(diff.next)}`,
    )
    .join('\n');
  void createAndActivate(
    { config_patch: payload.patch },
    payload.diffs.some(
      (diff) => diff.field.semantics === 'governance_critical',
    ),
    summary,
    $t('page.runtimeConfig.editor.applyTitle'),
  );
}

function applyAdvancedJson() {
  if (
    !advancedDoc.value ||
    typeof advancedDoc.value !== 'object' ||
    Array.isArray(advancedDoc.value)
  ) {
    message.error($t('page.runtimeConfig.editor.error.jsonObjectRequired'));
    return;
  }
  void createAndActivate(
    { config_json: advancedDoc.value },
    true,
    $t('page.runtimeConfig.editor.advancedSummary'),
    $t('page.runtimeConfig.editor.applyTitle'),
  );
}

watch(
  () => systemStore.activeConfigVersion,
  () => {
    if (suppressNextWsReload.value) {
      return;
    }
    void reload();
  },
);

onMounted(() => {
  void reload();
});
</script>

<template>
  <div ref="rootRef" class="runtime-config-editor">
    <RuntimeConfigEditorSkeleton v-if="!initialLoadComplete && loading" />

    <template v-else>
      <div
        class="runtime-config-editor-toolbar"
        :class="{ 'runtime-config-editor-toolbar--loading': loading }"
      >
        <Segmented
          block
          :disabled="loading"
          :options="modeOptions"
          :value="mode"
          @change="onModeChange"
        />
      </div>

      <div
        class="runtime-config-editor-body"
        :class="{ 'runtime-config-editor-body--loading': loading }"
      >
        <div
          v-if="
            !canApply ||
            success ||
            partialFailureVersionId ||
            pendingExternalReload
          "
          class="mb-4 space-y-2"
        >
          <Alert
            v-if="!canApply"
            :message="$t('page.runtimeConfig.editor.noApplyAccess')"
            show-icon
            type="warning"
          />
          <Alert
            v-if="pendingExternalReload"
            :message="$t('page.runtimeConfig.editor.reloadLiveConfig.pending')"
            show-icon
            type="warning"
          >
            <template #action>
              <Button size="small" @click="void reload({ force: true })">
                {{ $t('page.runtimeConfig.editor.reloadLiveConfig.reloadNow') }}
              </Button>
            </template>
          </Alert>
          <Alert v-if="success" :message="success" show-icon type="success" />
          <Alert
            v-if="partialFailureVersionId"
            :message="
              $t('page.runtimeConfig.editor.error.createdButNotActivated')
            "
            show-icon
            type="error"
          >
            <template #action>
              <Button
                size="small"
                @click="emit('openVersion', partialFailureVersionId)"
              >
                {{ $t('page.runtimeConfig.editor.viewVersion') }}
              </Button>
            </template>
          </Alert>
        </div>

        <template v-if="mode === 'form'">
          <RuntimeConfigTopSections
            v-if="sections.length > 0"
            v-model:active-section-key="activeSectionKey"
            :can-apply="canApply"
            :loading="loading"
            :locale="locale"
            :section-governance-critical="sectionGovernanceCritical"
            :section-meta="sectionMeta"
            :sections="sections"
          >
            <template #header="{ section }">
              <RuntimeConfigSectionIcon
                :section="section"
                size-class="size-3.5"
                variant="top"
              />
              <span class="text-foreground text-sm font-medium">
                {{ sectionTitle(section) }}
              </span>
              <Tag
                v-if="sectionMeta[section.id]?.dirty"
                color="processing"
                class="m-0 text-xs"
              >
                {{ $t('page.runtimeConfig.editor.state.dirty') }}
              </Tag>
              <Tag
                v-if="sectionGovernanceCritical[section.id]"
                color="warning"
                class="m-0 text-xs"
              >
                {{ $t('page.runtimeConfig.editor.state.governanceCritical') }}
              </Tag>
            </template>
            <template #actions="{ section }">
              <Button
                :disabled="loading || !sectionMeta[section.id]?.dirty"
                size="small"
                @click="sectionCards[section.id]?.resetDraft()"
              >
                {{ $t('common.reset') }}
              </Button>
              <Button
                :disabled="
                  !canApply ||
                  loading ||
                  !sectionMeta[section.id]?.dirty ||
                  Boolean(sectionMeta[section.id]?.error) ||
                  (sectionMeta[section.id]?.requireDiffAck &&
                    !sectionMeta[section.id]?.diffAcknowledged)
                "
                size="small"
                type="primary"
                @click="sectionCards[section.id]?.apply()"
              >
                {{ $t('common.apply') }}
              </Button>
            </template>
            <template #body="{ section }">
              <ConfigSectionCard
                :ref="(el) => bindSectionCard(section.id, el as Element | null)"
                :config="config"
                :fields="fieldIndex"
                :loading="loading"
                :section="section"
                @apply="applyPatch"
                @meta="(meta) => onSectionMeta(section.id, meta)"
              />
            </template>
          </RuntimeConfigTopSections>
        </template>

        <template v-else>
          <Alert
            :message="$t('page.runtimeConfig.editor.advancedHint')"
            class="mb-4"
            show-icon
            type="info"
          />
          <JsonEditorShell
            v-model="advancedDoc"
            :mode="Mode.tree"
            variant="document"
          />
          <div class="mt-4 flex justify-end">
            <Button
              :disabled="!canApply || loading"
              type="primary"
              @click="applyAdvancedJson"
            >
              {{ $t('page.runtimeConfig.editor.applyJson') }}
            </Button>
          </div>
        </template>
      </div>
    </template>

    <ReloadConfirmModal
      v-if="confirmDialog"
      :cancel-text="confirmDialog.cancelText"
      :confirm-text="confirmDialog.okText"
      :title="confirmDialog.title"
      class="max-w-md"
    >
      {{ confirmDialog.content }}
    </ReloadConfirmModal>
  </div>
</template>

<style scoped>
.runtime-config-editor-toolbar {
  position: sticky;
  top: 0;
  z-index: 2;
  padding-bottom: 0.75rem;
  margin-bottom: 1rem;
  overflow: hidden;
  background: transparent;
  border-bottom: 1px solid hsl(var(--border) / 50%);
  border-radius: 0.75rem;
}

.runtime-config-editor-toolbar--loading {
  pointer-events: none;
  opacity: 0.65;
}

.runtime-config-editor-body--loading {
  pointer-events: none;
  opacity: 0.65;
}
</style>
