<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import { computed } from 'vue';

import { AuthenticationLogin, z } from '@vben/common-ui';

import { Alert, Tag } from 'antdv-next';

import { $t } from '#/locales';
import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
  ];
});
</script>

<template>
  <AuthenticationLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    :show-code-login="false"
    :show-forget-password="false"
    :show-qrcode-login="false"
    :show-register="false"
    :sub-title="$t('page.dashboard.login.subtitle')"
    :title="$t('page.dashboard.login.title')"
    @submit="authStore.authLogin"
  >
    <template #third-party-login>
      <Alert class="mt-4" show-icon type="info">
        <template #message>
          <div class="flex items-center gap-2">
            <span>{{ $t('page.dashboard.login.console') }}</span>
            <Tag color="processing">ReportOnly</Tag>
          </div>
        </template>
        <template #description>
          {{ $t('page.dashboard.login.security') }}
        </template>
      </Alert>
    </template>
  </AuthenticationLogin>
</template>
