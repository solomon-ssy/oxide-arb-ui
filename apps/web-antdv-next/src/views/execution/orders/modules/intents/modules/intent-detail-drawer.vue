<script lang="ts" setup>
import type { OrderIntentView } from '@vben/types';

import { computed, ref, watch } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { getOrderIntent } from '#/api/order-intents';
import { $t } from '#/locales';
import AsyncState from '#/shared/components/async-state.vue';
import { useOrderIntentStore } from '#/store';

import IntentDetailPanel from './intent-detail-panel.vue';

defineOptions({ name: 'IntentDetailDrawer' });

const emit = defineEmits<{
  changed: [];
}>();

interface IntentDrawerData {
  intent: OrderIntentView;
}

const { handleRequest } = useRequestHandler();
const orderIntentStore = useOrderIntentStore();

const intent = ref<null | OrderIntentView>(null);
const loading = ref(false);
const loadError = ref<null | string>(null);
/** Intent id while the drawer is open; drives WS-driven refetch. */
const openIntentId = ref<null | string>(null);

const notFound = computed(
  () => !intent.value && !loading.value && !loadError.value,
);

async function refreshIntent(id: string) {
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
    if (openIntentId.value === id) {
      intent.value = fresh ?? null;
    }
  } finally {
    loading.value = false;
  }
}

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<IntentDrawerData>();
      openIntentId.value = data.intent.order_intent_id;
      loadError.value = null;
      // Seed from the list row for instant paint, then fetch the authoritative view.
      intent.value = data.intent;
      void refreshIntent(data.intent.order_intent_id);
    } else {
      openIntentId.value = null;
      intent.value = null;
      loadError.value = null;
    }
  },
});

function onChanged() {
  const id = openIntentId.value;
  if (id) {
    void refreshIntent(id);
  }
  emit('changed');
}

function retry() {
  const id = openIntentId.value;
  if (id) {
    void refreshIntent(id);
  }
}

watch(
  () => orderIntentStore.revision,
  () => {
    const id = openIntentId.value;
    if (id) {
      void refreshIntent(id);
    }
  },
);
</script>

<template>
  <Drawer
    :title="$t('page.quantIntents.detail.title')"
    class="w-full max-w-5xl"
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
  </Drawer>
</template>
