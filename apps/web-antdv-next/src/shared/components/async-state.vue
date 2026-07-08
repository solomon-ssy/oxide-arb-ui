<script lang="ts" setup>
import { Alert, Button, Empty, Spin } from 'antdv-next';

import { $t } from '#/locales';

defineOptions({ name: 'AsyncState' });

withDefaults(
  defineProps<{
    /** Set to show the error Alert (discriminated from `notFound` — a genuine 404 is not a retryable error). */
    errorMessage?: null | string;
    errorTitle?: string;
    loading?: boolean;
    notFound?: boolean;
    notFoundText?: string;
    retryText?: string;
  }>(),
  {
    errorMessage: null,
    errorTitle: undefined,
    loading: false,
    notFound: false,
    notFoundText: undefined,
    retryText: undefined,
  },
);

const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <Spin :spinning="loading">
    <Alert
      v-if="errorMessage"
      :description="errorMessage"
      :message="errorTitle ?? $t('page.shared.asyncState.loadError')"
      show-icon
      type="error"
    >
      <template #action>
        <Button size="small" @click="emit('retry')">
          {{ retryText ?? $t('page.shared.asyncState.retry') }}
        </Button>
      </template>
    </Alert>
    <Empty
      v-else-if="notFound"
      :description="notFoundText ?? $t('page.shared.asyncState.notFound')"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />
    <slot v-else></slot>
  </Spin>
</template>
