<script lang="ts" setup>
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationLoginExpiredModal } from '@vben/common-ui';
import { useWatermark } from '@vben/hooks';
import { UserRoundPen } from '@vben/icons';
import {
  BasicLayout,
  LockScreen,
  Notification,
  UserDropdown,
} from '@vben/layouts';
import { preferences, usePreferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import { $t } from '#/locales';
import ActivityCenter from '#/shared/components/header/activity-center.vue';
import CommandPalette from '#/shared/components/header/command-palette.vue';
import EntryAuthorizationPolicyIndicator from '#/shared/components/header/entry-authorization-policy-indicator.vue';
import KillSwitchIndicator from '#/shared/components/header/kill-switch-indicator.vue';
import SystemStatusIndicator from '#/shared/components/header/system-status-indicator.vue';
import WsStatusBadge from '#/shared/components/header/ws-status-badge.vue';
import PreflightResultDrawer from '#/shared/components/preflight-result-drawer.vue';
import { resolveThemeColor } from '#/shared/components/theme-color';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpWs } from '#/shared/composables/use-qp-ws';
import { useSystemStatusBootstrap } from '#/shared/composables/use-system-status';
import { useActivityStore, useAuthStore } from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';

const { GovernedActionHost } = useGovernedAction();

const qpWs = useQpWs();
useSystemStatusBootstrap();
// System alerts pushed over WS feed the bell list.
const notifications = qpWs.notifications;

const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();
const activityStore = useActivityStore();
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
      qpWs.connect();
    } else {
      qpWs.disconnect();
    }
  },
  { immediate: true },
);

function syncPageVisibility() {
  activityStore.setPageVisible(document.visibilityState === 'visible');
}

onMounted(() => {
  document.addEventListener('visibilitychange', syncPageVisibility);
  syncPageVisibility();
});
onUnmounted(() => {
  document.removeEventListener('visibilitychange', syncPageVisibility);
  qpWs.disconnect();
});

const menus = computed(() => [
  {
    handler: () => {
      router.push({ name: 'Profile' });
    },
    icon: UserRoundPen,
    text: $t('page.auth.profile'),
  },
]);

const avatar = computed(() => {
  return userStore.userInfo?.avatar || preferences.app.defaultAvatar;
});
// Prefer a setup binding for template use: script-setup's returned $setup
// currently omits the imported `preferences` object, so `preferences.app`
// in the template throws and the router guard sends users to /error.
const avatarAlt = computed(() => preferences.app.name);

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
  async ({ enable, content }) => {
    if (enable) {
      const watermarkColor = resolveThemeColor('--qp-text-primary', '12%');

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
    <template #global-search>
      <!-- Replaces Vben menu search so CommandPalette is the only Cmd+K owner. -->
    </template>
    <template #header-right-2>
      <CommandPalette />
    </template>
    <template #header-right-5>
      <ActivityCenter />
    </template>
    <template #header-right-10>
      <div class="hidden items-center md:flex">
        <WsStatusBadge />
        <SystemStatusIndicator />
        <EntryAuthorizationPolicyIndicator />
        <KillSwitchIndicator />
      </div>
    </template>
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :avatar-alt="avatarAlt"
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
      <PreflightResultDrawer />
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
