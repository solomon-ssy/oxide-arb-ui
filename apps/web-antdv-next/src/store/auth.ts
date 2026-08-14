import type {
  MenuTreeNode,
  MeResponse,
  Recordable,
  RoleView,
  UserInfo,
} from '@vben/types';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { resetAllStores, useAccessStore, useUserStore } from '@vben/stores';

import { notification } from 'antdv-next';
import { defineStore } from 'pinia';

import {
  getMeApi,
  loginApi,
  logoutApi,
  mapMeToUserInfo,
  refreshTokenApi,
} from '#/api';
import {
  clearAccessTokenAcrossTabs,
  publishAccessToken,
  refreshAccessToken,
} from '#/auth/refresh-coordinator';
import { $t } from '#/locales';

export const useAuthStore = defineStore('auth', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const router = useRouter();

  const loginLoading = ref(false);
  const cachedMenus = ref<MenuTreeNode[] | null>(null);
  const meRoles = ref<RoleView[]>([]);
  let restorePromise: null | Promise<void> = null;

  function loginDestination(userInfo: UserInfo) {
    const query = router.currentRoute.value.query.return_to;
    const raw = Array.isArray(query) ? query[0] : query;
    if (typeof raw === 'string') {
      let decoded: string;
      try {
        decoded = decodeURIComponent(raw);
      } catch {
        return userInfo.homePath || preferences.app.defaultHomePath;
      }
      if (decoded.startsWith('/') && !decoded.startsWith('//')) {
        return decoded;
      }
    }
    return userInfo.homePath || preferences.app.defaultHomePath;
  }

  async function applyMeResponse(me: MeResponse) {
    const userInfo = mapMeToUserInfo(me);
    userStore.setUserInfo(userInfo);
    cachedMenus.value = me.menus;
    meRoles.value = me.roles;
    return userInfo;
  }

  function clearSessionCredentials() {
    clearAccessTokenAcrossTabs();
    accessStore.setAccessCodes([]);
    accessStore.setAccessMenus([]);
    accessStore.setAccessRoutes([]);
    accessStore.setIsAccessChecked(false);
    userStore.setUserInfo(null);
    cachedMenus.value = null;
    meRoles.value = [];
  }

  async function restoreSession() {
    if (accessStore.accessToken) {
      return;
    }
    restorePromise ??= (async () => {
      try {
        await refreshAccessToken(refreshTokenApi);
      } catch (error) {
        clearSessionCredentials();
        throw error;
      }
    })();
    try {
      await restorePromise;
    } finally {
      restorePromise = null;
    }
  }

  async function authLogin(
    params: Recordable<any>,
    onSuccess?: () => Promise<void> | void,
  ): Promise<{ userInfo: null | UserInfo }> {
    try {
      loginLoading.value = true;
      const tokens = await loginApi({
        password: String(params.password ?? ''),
        username: String(params.username ?? ''),
      });

      publishAccessToken(tokens.access_token);

      let userInfo: UserInfo;
      try {
        userInfo = await applyMeResponse(await getMeApi());
      } catch (error) {
        clearSessionCredentials();
        throw error;
      }

      if (accessStore.loginExpired) {
        accessStore.setLoginExpired(false);
      } else {
        onSuccess
          ? await onSuccess?.()
          : await router.push(loginDestination(userInfo));
      }

      if (userInfo.realName) {
        notification.success({
          description: `${$t('authentication.loginSuccessDesc')}:${userInfo.realName}`,
          duration: 3,
          title: $t('authentication.loginSuccess'),
        });
      }

      return { userInfo };
    } finally {
      loginLoading.value = false;
    }
  }

  async function logout(redirect: boolean = true) {
    try {
      await logoutApi(accessStore.accessToken);
    } catch {
      // Best-effort server revoke; always clear local session.
    }

    clearAccessTokenAcrossTabs();
    cachedMenus.value = null;
    meRoles.value = [];
    resetAllStores();
    accessStore.setLoginExpired(false);

    await router.replace({
      path: LOGIN_PATH,
      query: redirect
        ? {
            return_to: encodeURIComponent(router.currentRoute.value.fullPath),
          }
        : {},
    });
  }

  async function fetchUserInfo() {
    const me = await getMeApi();
    return applyMeResponse(me);
  }

  function $reset() {
    loginLoading.value = false;
    cachedMenus.value = null;
    meRoles.value = [];
  }

  return {
    $reset,
    applyMeResponse,
    authLogin,
    cachedMenus,
    fetchUserInfo,
    loginLoading,
    logout,
    meRoles,
    restoreSession,
  };
});
