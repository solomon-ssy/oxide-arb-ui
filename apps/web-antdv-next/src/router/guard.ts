import type { RouteLocationRaw, Router } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { ApiError, normalizeApiError } from '@vben/request/qp';
import { useAccessStore, useUserStore } from '@vben/stores';
import { startProgress, stopProgress } from '@vben/utils';

import { accessRoutes, coreRouteNames } from '#/router/routes';
import { useAuthStore } from '#/store';

import { generateAccess } from './access';

const PUBLIC_CORE_ROUTE_NAMES = new Set([
  'Authentication',
  'FallbackForbidden',
  'FallbackNotFound',
  'FallbackServerError',
  'Login',
  'Offline',
]);

const SERVICE_UNAVAILABLE_STATUSES = new Set([502, 503, 504]);

function loginRoute(target: string): RouteLocationRaw {
  return {
    path: LOGIN_PATH,
    query:
      target === preferences.app.defaultHomePath
        ? {}
        : { redirect: encodeURIComponent(target) },
    replace: true,
  };
}

function isChunkTransportFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Failed to fetch dynamically imported module|Importing a module script failed/u.test(
    message,
  );
}

function failureRoute(
  error: unknown,
  target: string,
): false | RouteLocationRaw {
  const normalized = normalizeApiError(error);
  if (normalized.kind === 'cancelled') {
    return false;
  }
  if (
    normalized.kind === 'network' ||
    normalized.kind === 'timeout' ||
    SERVICE_UNAVAILABLE_STATUSES.has(
      normalized.httpStatus ?? normalized.code,
    ) ||
    isChunkTransportFailure(error)
  ) {
    return {
      name: 'Offline',
      query: { redirect: target },
      replace: true,
    };
  }
  if (normalized.httpStatus === 401 || normalized.code === 401) {
    return loginRoute(target);
  }
  if (normalized.httpStatus === 403 || normalized.code === 403) {
    return { name: 'FallbackForbidden', replace: true };
  }
  return { name: 'FallbackServerError', replace: true };
}

function setupCommonGuard(router: Router) {
  const loadedPaths = new Set<string>();

  router.beforeEach((to) => {
    to.meta.loaded = loadedPaths.has(to.path);
    if (!to.meta.loaded && preferences.transition.progress) {
      startProgress();
    }
    return true;
  });

  router.afterEach((to, _from, failure) => {
    if (!failure) {
      loadedPaths.add(to.path);
    }
    if (preferences.transition.progress) {
      stopProgress();
    }
  });

  router.onError((error, to) => {
    if (preferences.transition.progress) {
      stopProgress();
    }
    if (
      to.name === 'Offline' ||
      to.name === 'FallbackServerError' ||
      (ApiError.is(error) && error.kind === 'cancelled')
    ) {
      return;
    }
    const destination = failureRoute(error, to.fullPath);
    if (destination) {
      void router.replace(destination);
    }
  });
}

function setupAccessGuard(router: Router) {
  router.beforeEach(async (to, from) => {
    const accessStore = useAccessStore();
    const userStore = useUserStore();
    const authStore = useAuthStore();

    if (PUBLIC_CORE_ROUTE_NAMES.has(to.name as string)) {
      if (to.path === LOGIN_PATH && accessStore.accessToken) {
        return decodeURIComponent(
          (to.query.redirect as string) ||
            userStore.userInfo?.homePath ||
            preferences.app.defaultHomePath,
        );
      }
      return true;
    }

    if (!accessStore.accessToken && !to.meta.ignoreAccess) {
      try {
        await authStore.restoreSession();
      } catch (error) {
        return failureRoute(error, to.fullPath);
      }
    }

    if (!accessStore.accessToken) {
      return to.meta.ignoreAccess ? true : loginRoute(to.fullPath);
    }

    if (coreRouteNames.includes(to.name as string)) {
      return true;
    }

    if (accessStore.isAccessChecked) {
      return true;
    }

    let userInfo;
    try {
      userInfo = userStore.userInfo || (await authStore.fetchUserInfo());
    } catch (error) {
      return failureRoute(error, to.fullPath);
    }
    const userRoles = userInfo.roles ?? [];

    try {
      const { accessibleMenus, accessibleRoutes } = await generateAccess({
        roles: userRoles,
        router,
        routes: accessRoutes,
      });

      accessStore.setAccessMenus(accessibleMenus);
      accessStore.setAccessRoutes(accessibleRoutes);
      accessStore.setIsAccessChecked(true);
    } catch (error) {
      return failureRoute(error, to.fullPath);
    }

    const redirectPath = (from.query.redirect ??
      (to.path === preferences.app.defaultHomePath
        ? userInfo.homePath || preferences.app.defaultHomePath
        : to.fullPath)) as string;

    return {
      ...router.resolve(decodeURIComponent(redirectPath)),
      replace: true,
    };
  });
}

function createRouterGuard(router: Router) {
  setupCommonGuard(router);
  setupAccessGuard(router);
}

export { createRouterGuard };
