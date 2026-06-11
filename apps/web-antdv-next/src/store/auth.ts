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

import { getMeApi, loginApi, logoutApi, mapMeToUserInfo } from '#/api';
import { $t } from '#/locales';

export const useAuthStore = defineStore('auth', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const router = useRouter();

  const loginLoading = ref(false);
  const cachedMenus = ref<MenuTreeNode[] | null>(null);
  const meRoles = ref<RoleView[]>([]);

  async function applyMeResponse(me: MeResponse) {
    const userInfo = mapMeToUserInfo(me);
    userStore.setUserInfo(userInfo);
    cachedMenus.value = me.menus;
    meRoles.value = me.roles;
    return userInfo;
  }

  function clearSessionCredentials() {
    accessStore.setAccessToken(null);
    accessStore.setRefreshToken(null);
    cachedMenus.value = null;
    meRoles.value = [];
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

      accessStore.setAccessToken(tokens.access_token);
      accessStore.setRefreshToken(tokens.refresh_token);

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
          : await router.push(
              userInfo.homePath || preferences.app.defaultHomePath,
            );
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
      await logoutApi(
        { refresh_token: accessStore.refreshToken ?? undefined },
        accessStore.accessToken,
      );
    } catch {
      // Best-effort server revoke; always clear local session.
    }

    cachedMenus.value = null;
    meRoles.value = [];
    resetAllStores();
    accessStore.setLoginExpired(false);

    await router.replace({
      path: LOGIN_PATH,
      query: redirect
        ? {
            redirect: encodeURIComponent(router.currentRoute.value.fullPath),
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
  };
});
