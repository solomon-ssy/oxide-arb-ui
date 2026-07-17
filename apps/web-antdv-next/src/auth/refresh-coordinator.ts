import type { TokenResponse } from '@vben/types';

import { useAccessStore } from '@vben/stores';

const CHANNEL_NAME = 'quant-pivot.auth.session';
const REFRESH_LOCK_NAME = 'quant-pivot.auth.refresh';

type SessionMessage =
  | { token: string; type: 'access-token' }
  | { type: 'session-cleared' };

let channel: BroadcastChannel | null = null;
let refreshPromise: null | Promise<string> = null;

function accessChannel() {
  if (channel || typeof BroadcastChannel === 'undefined') {
    return channel;
  }
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.addEventListener('message', (event: MessageEvent<SessionMessage>) => {
    const accessStore = useAccessStore();
    if (event.data.type === 'access-token') {
      accessStore.setAccessToken(event.data.token);
    } else if (event.data.type === 'session-cleared') {
      accessStore.setAccessToken(null);
    }
  });
  return channel;
}

export function publishAccessToken(token: string) {
  useAccessStore().setAccessToken(token);
  accessChannel()?.postMessage({
    token,
    type: 'access-token',
  } satisfies SessionMessage);
}

export function clearAccessTokenAcrossTabs() {
  useAccessStore().setAccessToken(null);
  accessChannel()?.postMessage({
    type: 'session-cleared',
  } satisfies SessionMessage);
}

async function rotateIfStillRequired(
  failedToken: null | string,
  rotate: () => Promise<TokenResponse>,
) {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  const current = useAccessStore().accessToken;
  if (current && current !== failedToken) {
    return current;
  }
  const response = await rotate();
  publishAccessToken(response.access_token);
  return response.access_token;
}

async function rotateAcrossTabs(
  failedToken: null | string,
  rotate: () => Promise<TokenResponse>,
) {
  accessChannel();
  if (typeof navigator === 'undefined' || !navigator.locks) {
    clearAccessTokenAcrossTabs();
    throw new Error('secure cross-tab refresh coordination is unavailable');
  }
  return navigator.locks.request(REFRESH_LOCK_NAME, () =>
    rotateIfStillRequired(failedToken, rotate),
  );
}

/** Serialize refresh rotation in this tab and across same-origin tabs. */
export function refreshAccessToken(
  rotate: () => Promise<TokenResponse>,
  failedAuthorization?: null | string,
) {
  const failedToken = failedAuthorization?.startsWith('Bearer ')
    ? failedAuthorization.slice('Bearer '.length)
    : null;
  refreshPromise ??= rotateAcrossTabs(failedToken, rotate).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}
