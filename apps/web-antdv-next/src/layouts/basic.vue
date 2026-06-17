<script lang="ts" setup>
import { computed, onUnmounted, provide, watch } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationLoginExpiredModal } from '@vben/common-ui';
import { useWatermark } from '@vben/hooks';
import {
  BasicLayout,
  LockScreen,
  Notification,
  RuntimeConfigGovernedKey,
  RuntimeConfigRequestClientKey,
  RuntimeConfigRevisionKey,
  UserDropdown,
} from '@vben/layouts';
import { preferences, usePreferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import { requestClient } from '#/api/request';
import { $t } from '#/locales';
import ExecutionModeSwitcher from '#/shared/components/header/execution-mode-switcher.vue';
import SystemStatusIndicator from '#/shared/components/header/system-status-indicator.vue';
import WsStatusBadge from '#/shared/components/header/ws-status-badge.vue';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useOxideWs } from '#/shared/composables/use-oxide-ws';
import { useSystemControl } from '#/shared/composables/use-system-control';
import { useSystemStatusBootstrap } from '#/shared/composables/use-system-status';
import { useAuthStore, useSystemStore } from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';

const systemStore = useSystemStore();

const { GovernedActionHost, governed } = useGovernedAction();
const { HaltModalHost, ResumeModalHost } = useSystemControl();
provide(RuntimeConfigGovernedKey, governed);
provide(RuntimeConfigRequestClientKey, requestClient);
provide(RuntimeConfigRevisionKey, () => systemStore.activeConfigVersion);

const oxideWs = useOxideWs();
useSystemStatusBootstrap();
// System alerts + breaker trips pushed over WS feed the bell list.
const notifications = oxideWs.notifications;

const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const { destroyWatermark, updateWatermark } = useWatermark();
const { isDark } = usePreferences();
const showDot = computed(() =>
  notifications.value.some((item) => !item.isRead),
);

// Connect once the session is authenticated and the access check completed;
// drop the socket on logout. A token refresh flips neither flag, so it never
// forces a reconnect (the next reconnect picks up the newest token).
watch(
  () => Boolean(accessStore.accessToken && accessStore.isAccessChecked),
  (ready) => {
    if (ready) {
      oxideWs.connect();
    } else {
      oxideWs.disconnect();
    }
  },
  { immediate: true },
);

onUnmounted(() => oxideWs.disconnect());

const menus = computed(() => [
  {
    handler: () => {
      router.push({ name: 'Profile' });
    },
    icon: 'lucide:user',
    text: $t('page.auth.profile'),
  },
]);

const avatar = computed(() => {
  return userStore.userInfo?.avatar ?? preferences.app.defaultAvatar;
});

async function handleLogout() {
  await authStore.logout(false);
}

function handleNoticeClear() {
  notifications.value = [];
}

function markRead(id: number | string) {
  const item = notifications.value.find((item) => item.id === id);
  if (item) {
    item.isRead = true;
  }
}

function remove(id: number | string) {
  notifications.value = notifications.value.filter((item) => item.id !== id);
}

function handleMakeAll() {
  notifications.value.forEach((item) => (item.isRead = true));
}

watch(
  () => ({
    enable: preferences.app.watermark,
    content: preferences.app.watermarkContent,
    isDark: isDark.value,
  }),
  async ({ enable, content, isDark: isDarkValue }) => {
    if (enable) {
      const watermarkColor = isDarkValue
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(0, 0, 0, 0.12)';

      await updateWatermark({
        advancedStyle: {
          colorStops: [
            {
              color: watermarkColor,
              offset: 0,
            },
            {
              color: watermarkColor,
              offset: 1,
            },
          ],
          type: 'linear',
        },
        content:
          content ||
          `${userStore.userInfo?.username} - ${userStore.userInfo?.realName}`,
      });
    } else {
      destroyWatermark();
    }
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <BasicLayout @clear-preferences-and-logout="handleLogout">
    <template #header-right-10>
      <SystemStatusIndicator />
    </template>
    <template #header-right-20>
      <ExecutionModeSwitcher />
    </template>
    <template #header-right-30>
      <WsStatusBadge />
    </template>
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :menus
        :text="userStore.userInfo?.realName"
        :description="userStore.userInfo?.username"
        @logout="handleLogout"
        @clear-preferences-and-logout="handleLogout"
      />
    </template>
    <template #notification>
      <Notification
        :dot="showDot"
        :notifications="notifications"
        @clear="handleNoticeClear"
        @read="(item) => item.id && markRead(item.id)"
        @remove="(item) => item.id && remove(item.id)"
        @make-all="handleMakeAll"
      />
    </template>
    <template #extra>
      <GovernedActionHost />
      <HaltModalHost />
      <ResumeModalHost />
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
    </template>
    <template #lock-screen>
      <LockScreen :avatar @to-login="handleLogout" />
    </template>
  </BasicLayout>
</template>
