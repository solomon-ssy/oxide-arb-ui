<script lang="ts" setup>
import type { OrderIntentView } from '@vben/types';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { normalizeApiError } from '@vben/request/qp';

import { Alert, Button, Empty, Spin } from 'antdv-next';

import { getOrderIntent } from '#/api/order-intents';
import { $t } from '#/locales';
import { useOrderIntentStore } from '#/store';

import IntentDetailPanel from '../modules/intent-detail-panel.vue';

defineOptions({ name: 'OrderIntentDetailPage' });

/**
 * Discriminated load state so a genuine 404 (intent gone) is distinguished from
 * a transport / server failure — the latter is recoverable and surfaces the
 * backend detail with a retry, never masquerading as "not found".
 */
type LoadState =
  | { intent: OrderIntentView; kind: 'ready' }
  | { kind: 'error'; message: string }
  | { kind: 'loading' }
  | { kind: 'not_found' };

const route = useRoute();
const router = useRouter();
const orderIntentStore = useOrderIntentStore();

const state = ref<LoadState>({ kind: 'loading' });

const intentId = computed(() => route.params.id as string);

async function load() {
  if (!intentId.value) {
    return;
  }
  state.value = { kind: 'loading' };
  try {
    const intent = await getOrderIntent(intentId.value);
    state.value = { intent, kind: 'ready' };
  } catch (error) {
    const apiError = normalizeApiError(error);
    state.value =
      apiError.httpStatus === 404 || apiError.code === 404
        ? { kind: 'not_found' }
        : { kind: 'error', message: apiError.message };
  }
}

function goBack() {
  void router.push('/quant/intents');
}

watch(intentId, () => void load());
// Intent lifecycle (local action or `quant.intent` WS) refreshes the view.
watch(
  () => orderIntentStore.revision,
  () => {
    if (state.value.kind === 'ready') {
      void load();
    }
  },
);
onMounted(() => void load());
</script>

<template>
  <Page auto-content-height>
    <div class="mb-4">
      <Button type="link" @click="goBack">
        {{ $t('page.quantIntents.detail.back') }}
      </Button>
    </div>
    <Spin :spinning="state.kind === 'loading'">
      <IntentDetailPanel
        v-if="state.kind === 'ready'"
        :intent="state.intent"
        @changed="load"
      />
      <Alert
        v-else-if="state.kind === 'error'"
        :description="state.message"
        :message="$t('page.quantIntents.detail.loadError')"
        show-icon
        type="error"
      >
        <template #action>
          <Button size="small" @click="load">
            {{ $t('page.quantIntents.detail.retry') }}
          </Button>
        </template>
      </Alert>
      <Empty
        v-else-if="state.kind === 'not_found'"
        :description="$t('page.quantIntents.detail.notFound')"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />
    </Spin>
  </Page>
</template>
