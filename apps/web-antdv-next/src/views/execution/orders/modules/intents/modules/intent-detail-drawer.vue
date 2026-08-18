<script lang="ts" setup>
import type { OrderIntentView } from '@vben/types';

import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useRequestHandler } from '@vben/request/qp';

import { getOrderIntent } from '#/api/order-intents';
import { $t } from '#/locales';
import AsyncState from '#/shared/components/async-state.vue';
import WorkspaceObjectStage from '#/shared/components/workspace/workspace-object-stage.vue';
import { useOrderIntentStore } from '#/store';

import IntentDetailPanel from './intent-detail-panel.vue';

defineOptions({ name: 'IntentDetailDrawer' });

const emit = defineEmits<{
  changed: [];
}>();

const route = useRoute();
const router = useRouter();
const { handleRequest } = useRequestHandler();
const orderIntentStore = useOrderIntentStore();

const intent = ref<null | OrderIntentView>(null);
const loading = ref(false);
const loadError = ref<null | string>(null);

const intentId = computed(() => {
  const entity = Array.isArray(route.query.entity)
    ? route.query.entity[0]
    : route.query.entity;
  const id = Array.isArray(route.query.id) ? route.query.id[0] : route.query.id;
  return entity === 'order-intent' && typeof id === 'string' ? id : '';
});
const inspectorOpen = computed({
  get: () => intentId.value !== '',
  set: (value: boolean) => {
    if (!value) goBack();
  },
});
const notFound = computed(
  () =>
    !intent.value &&
    !loading.value &&
    !loadError.value &&
    intentId.value !== '',
);

async function loadIntent(id: string) {
  loading.value = true;
  loadError.value = null;
  try {
    const fresh = await handleRequest(() => getOrderIntent(id), {
      silent: true,
      onError: (err) => {
        if (err.httpStatus !== 404) {
          loadError.value = err.message;
        }
      },
    });
    if (intentId.value === id) {
      intent.value = fresh ?? null;
    }
  } finally {
    loading.value = false;
  }
}

function goBack() {
  const { entity: _entity, id: _id, ...query } = route.query;
  void router.push({ query });
}

function onChanged() {
  if (intentId.value) {
    void loadIntent(intentId.value);
  }
  emit('changed');
}

function retry() {
  if (intentId.value) {
    void loadIntent(intentId.value);
  }
}

watch(intentId, (id) => {
  if (!id) {
    intent.value = null;
    loadError.value = null;
    return;
  }
  void loadIntent(id);
});
watch(
  () => orderIntentStore.revision,
  () => {
    if (intentId.value) {
      void loadIntent(intentId.value);
    }
  },
);
</script>

<template>
  <WorkspaceObjectStage
    v-model:open="inspectorOpen"
    :title="$t('page.quantIntents.detail.title')"
  >
    <AsyncState
      :error-message="loadError"
      :loading="loading && !intent"
      :not-found="notFound"
      :not-found-text="$t('page.quantIntents.detail.notFound')"
      @retry="retry"
    >
      <IntentDetailPanel v-if="intent" :intent="intent" @changed="onChanged" />
    </AsyncState>
  </WorkspaceObjectStage>
</template>
