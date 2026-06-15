<script lang="ts" setup>
import type { ControlFactorType } from '@vben/types';

import type { ReplayCreateRequest } from '#/api/replay';

import { reactive, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { CONTROL_FACTOR_TYPES, MARKET_CATEGORIES } from '@vben/types';

import { Select } from 'antdv-next';

import { $t } from '#/locales';

defineOptions({ name: 'CreateReplayDrawer' });

interface DrawerPayload {
  onSubmit: (payload: ReplayCreateRequest) => Promise<boolean>;
}

const form = reactive({
  categories: [] as string[],
  event_ids: '',
  force_new_run: false,
  from: '',
  holder_address: '',
  market_ids: '',
  requested_factor_types: [] as ControlFactorType[],
  to: '',
  token_ids: '',
});
const error = ref('');

function splitList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : '';
}

function reset() {
  form.categories = [];
  form.event_ids = '';
  form.force_new_run = false;
  form.from = '';
  form.holder_address = '';
  form.market_ids = '';
  form.requested_factor_types = [];
  form.to = '';
  form.token_ids = '';
  error.value = '';
}

const [Drawer, drawerApi] = useVbenDrawer({
  onConfirm: async () => {
    if (!form.from || !form.to || form.requested_factor_types.length === 0) {
      error.value = $t('page.replay.create.error.required');
      return;
    }
    const payload = drawerApi.getData<DrawerPayload>();
    drawerApi.lock();
    try {
      const succeeded = await payload.onSubmit({
        categories: form.categories,
        event_ids: splitList(form.event_ids),
        force_new_run: form.force_new_run,
        from: toIso(form.from),
        holder_address: form.holder_address.trim() || undefined,
        market_ids: splitList(form.market_ids),
        requested_factor_types: form.requested_factor_types,
        to: toIso(form.to),
        token_ids: splitList(form.token_ids),
        reason: '',
      });
      if (succeeded) {
        drawerApi.close();
      }
    } finally {
      drawerApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      reset();
    }
  },
});
</script>

<template>
  <Drawer :title="$t('page.replay.create.title')" class="w-full max-w-3xl">
    <div
      v-if="error"
      class="mb-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600"
    >
      {{ error }}
    </div>
    <div class="grid gap-4 md:grid-cols-2">
      <label class="block">
        <span class="mb-1 block text-sm font-medium">{{
          $t('page.replay.create.from')
        }}</span>
        <input
          v-model="form.from"
          class="bg-background w-full rounded border px-2 py-1 text-sm"
          type="datetime-local"
        />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">{{
          $t('page.replay.create.to')
        }}</span>
        <input
          v-model="form.to"
          class="bg-background w-full rounded border px-2 py-1 text-sm"
          type="datetime-local"
        />
      </label>
      <label class="block md:col-span-2">
        <span class="mb-1 block text-sm font-medium">{{
          $t('page.replay.create.requestedFactorTypes')
        }}</span>
        <Select
          v-model:value="form.requested_factor_types"
          class="w-full"
          mode="multiple"
          :options="
            Object.values(CONTROL_FACTOR_TYPES).map((value) => ({
              label: $t(`enum.controlFactorType.${value}`),
              value,
            }))
          "
        />
      </label>
      <label class="block md:col-span-2">
        <span class="mb-1 block text-sm font-medium">{{
          $t('page.replay.create.categories')
        }}</span>
        <Select
          v-model:value="form.categories"
          class="w-full"
          mode="multiple"
          :options="
            Object.values(MARKET_CATEGORIES).map((value) => ({
              label: $t(`enum.marketCategory.${value}`),
              value,
            }))
          "
        />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">{{
          $t('page.replay.create.marketIds')
        }}</span>
        <textarea
          v-model="form.market_ids"
          class="bg-background min-h-24 w-full rounded border px-2 py-1 font-mono text-xs"
        ></textarea>
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">{{
          $t('page.replay.create.tokenIds')
        }}</span>
        <textarea
          v-model="form.token_ids"
          class="bg-background min-h-24 w-full rounded border px-2 py-1 font-mono text-xs"
        ></textarea>
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">{{
          $t('page.replay.create.eventIds')
        }}</span>
        <textarea
          v-model="form.event_ids"
          class="bg-background min-h-24 w-full rounded border px-2 py-1 font-mono text-xs"
        ></textarea>
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">{{
          $t('page.replay.create.holderAddress')
        }}</span>
        <input
          v-model="form.holder_address"
          class="bg-background w-full rounded border px-2 py-1 text-sm"
        />
      </label>
      <label class="flex items-center gap-2 md:col-span-2">
        <input v-model="form.force_new_run" type="checkbox" />
        <span class="text-sm">{{ $t('page.replay.create.forceNewRun') }}</span>
      </label>
    </div>
  </Drawer>
</template>
