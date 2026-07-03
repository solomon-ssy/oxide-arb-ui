<script lang="ts" setup>
import type { OrderIntentView } from '@vben/types';

import { ref, watch } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Spin } from 'antdv-next';

import { getOrderIntent } from '#/api/order-intents';
import { $t } from '#/locales';
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
/** Intent id while the drawer is open; drives WS-driven refetch. */
const openIntentId = ref<null | string>(null);

async function refreshIntent(id: string) {
  loading.value = true;
  try {
    const fresh = await handleRequest(() => getOrderIntent(id), {
      silent: true,
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
      // Seed from the list row for instant paint, then fetch the authoritative view.
      intent.value = data.intent;
      void refreshIntent(data.intent.order_intent_id);
    } else {
      openIntentId.value = null;
      intent.value = null;
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

// Intent lifecycle (local action or `quant.intent` WS) must converge the view.
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
    <Spin :spinning="loading">
      <IntentDetailPanel v-if="intent" :intent="intent" @changed="onChanged" />
    </Spin>
  </Drawer>
</template>
