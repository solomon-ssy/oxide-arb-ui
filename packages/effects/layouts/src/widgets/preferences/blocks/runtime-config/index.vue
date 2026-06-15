<script setup lang="ts">
import type {
  RuntimeConfigDocument,
  RuntimeConfigSchemaView,
} from '@vben/types';

import type { RuntimeConfigApplyPayload, RuntimeConfigGoverned } from './types';

import { computed, inject, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import { $t } from '@vben/locales';
import { useAccessStore } from '@vben/stores';

import { useRuntimeConfigApi } from './api';
import ConfigGroupCard from './config-group-card.vue';
import { groupRuntimeConfigFields } from './schema-mapper';
import { RuntimeConfigGovernedKey, RuntimeConfigRevisionKey } from './types';

const accessStore = useAccessStore();
const api = useRuntimeConfigApi();
const governed = inject(
  RuntimeConfigGovernedKey,
  null,
) as null | RuntimeConfigGoverned;
const configRevision = inject(RuntimeConfigRevisionKey, () => null);

const loading = ref(false);
const error = ref('');
const partialFailureVersionId = ref<null | string>(null);
const success = ref('');
const schema = ref<RuntimeConfigSchemaView>({ fields: [], groups: [] });
const config = ref<RuntimeConfigDocument>({});

const groups = computed(() => groupRuntimeConfigFields(schema.value));
const canApply = computed(
  () =>
    accessStore.accessCodes.includes('runtime_config:create') &&
    accessStore.accessCodes.includes('runtime_config:activate') &&
    Boolean(governed),
);

async function reload() {
  loading.value = true;
  error.value = '';
  partialFailureVersionId.value = null;
  success.value = '';
  try {
    const [schemaView, current] = await Promise.all([
      api.getSchema(),
      api.getCurrent(),
    ]);
    schema.value = schemaView;
    config.value = current.config;
  } catch (error_) {
    error.value = error_ instanceof Error ? error_.message : String(error_);
  } finally {
    loading.value = false;
  }
}

function diffSummary(payload: RuntimeConfigApplyPayload) {
  return payload.diffs
    .map(
      (diff) =>
        `${diff.path}: ${JSON.stringify(diff.previous)} -> ${JSON.stringify(diff.next)}`,
    )
    .join('\n');
}

async function apply(payload: RuntimeConfigApplyPayload) {
  if (!governed) {
    error.value = api.missingGovernanceBridgeMessage();
    return;
  }
  const result = await governed(
    async (ctx) => {
      const created = await api.createVersionPatch(payload.patch, ctx);
      try {
        const activation = await api.activateVersion(
          created.runtime_config_version_id,
          ctx,
        );
        return {
          activatedVersionId: activation.runtime_config_version_id,
          createdVersion: created,
        };
      } catch (error_) {
        partialFailureVersionId.value = created.runtime_config_version_id;
        error.value = error_ instanceof Error ? error_.message : String(error_);
        throw error_;
      }
    },
    {
      danger: payload.diffs.some((diff) => diff.field.money_critical),
      summary: `${$t('preferences.runtimeConfig.applySummary')}\n\n${diffSummary(payload)}`,
      title: $t('preferences.runtimeConfig.applyTitle'),
    },
  );
  if (result) {
    await reload();
    success.value = $t('preferences.runtimeConfig.applySuccess');
  }
}

watch(
  () => configRevision(),
  () => {
    void reload();
  },
);

onMounted(() => {
  void reload();
});
</script>

<template>
  <div class="space-y-4">
    <div
      v-if="success"
      class="rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-600"
    >
      {{ success }}
    </div>
    <div
      v-if="error || partialFailureVersionId"
      class="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600"
    >
      <template v-if="partialFailureVersionId">
        <i18n-t
          keypath="preferences.runtimeConfig.error.createdButNotActivated"
        >
          <template #link>
            <RouterLink
              class="font-mono underline"
              :to="{
                path: '/runtime-config',
                query: { version_id: partialFailureVersionId },
              }"
            >
              {{ partialFailureVersionId }}
            </RouterLink>
          </template>
        </i18n-t>
        <p v-if="error" class="mt-2">{{ error }}</p>
      </template>
      <template v-else>
        {{ error }}
      </template>
    </div>
    <div
      v-if="!canApply"
      class="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700"
    >
      {{ $t('preferences.runtimeConfig.noApplyAccess') }}
    </div>
    <ConfigGroupCard
      v-for="group in groups"
      :key="group.key"
      :can-apply="canApply"
      :config="config"
      :group="group"
      :loading="loading"
      @apply="apply"
      @reload="reload"
    />
  </div>
</template>
