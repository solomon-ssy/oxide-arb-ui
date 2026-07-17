import type { ApiRawResponse } from '@vben/request/qp';
import type {
  LoginRequest,
  MeResponse,
  TokenResponse,
  UserInfo,
} from '@vben/types';

import { unwrapApiResponse } from '@vben/request/qp';

import { buildAuthApiHeaders } from '#/api/headers';
import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  export const base = '/auth';
  export const login = `${base}/login`;
  export const refresh = `${base}/refresh`;
  export const logout = `${base}/logout`;
  export const me = `${base}/me`;

  export type LoginParams = LoginRequest;
}

/** Map `/auth/me` into vben `UserInfo`. */
export function mapMeToUserInfo(me: MeResponse): UserInfo {
  const { user, roles } = me;
  return {
    avatar: user.avatar ?? '',
    desc: user.nickname,
    homePath: '/dashboard',
    realName: user.nickname || user.username,
    roles: roles.map((role) => role.code),
    token: '',
    userId: user.id,
    username: user.username,
  };
}

export async function loginApi(data: AuthApi.LoginParams) {
  return requestClient.post<TokenResponse>(AuthApi.login, data);
}

export async function refreshTokenApi() {
  const response = (await baseRequestClient.post(
    AuthApi.refresh,
    undefined,
  )) as ApiRawResponse<TokenResponse>;
  return unwrapApiResponse(response);
}

export async function logoutApi(accessToken?: null | string) {
  const response = (await baseRequestClient.post(AuthApi.logout, undefined, {
    headers: buildAuthApiHeaders(accessToken),
  })) as ApiRawResponse<null>;
  return unwrapApiResponse(response);
}

export async function getMeApi() {
  return requestClient.get<MeResponse>(AuthApi.me);
}
