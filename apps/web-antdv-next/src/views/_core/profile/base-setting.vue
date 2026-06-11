<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/form';

import { computed, onMounted, ref } from 'vue';

import { ProfileBaseSetting } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { useAuthStore } from '#/store';

const authStore = useAuthStore();
const userStore = useUserStore();
const profileBaseSettingRef = ref<{
  getFormApi: () => { setValues: (v: Record<string, string>) => void };
}>();

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'Input',
      componentProps: { disabled: true },
      fieldName: 'realName',
      label: 'Nickname',
    },
    {
      component: 'Input',
      componentProps: { disabled: true },
      fieldName: 'username',
      label: 'Username',
    },
    {
      component: 'Input',
      componentProps: { disabled: true },
      fieldName: 'roles',
      label: 'Roles',
    },
  ];
});

function applyUserInfoToForm() {
  const userInfo = userStore.userInfo;
  if (!userInfo) {
    return;
  }
  profileBaseSettingRef.value?.getFormApi()?.setValues({
    realName: userInfo.realName,
    roles: userInfo.roles?.join(', ') ?? '',
    username: userInfo.username,
  });
}

onMounted(async () => {
  if (userStore.userInfo) {
    applyUserInfoToForm();
    return;
  }
  await authStore.fetchUserInfo();
  applyUserInfoToForm();
});
</script>
<template>
  <ProfileBaseSetting ref="profileBaseSettingRef" :form-schema="formSchema" />
</template>
