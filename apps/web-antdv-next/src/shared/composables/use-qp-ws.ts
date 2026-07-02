import type { ComputedRef, Ref } from 'vue';

import type { NotificationItem } from '@vben/layouts';
import type {
  AlertLevel,
  MarketId,
  WsClientCommand,
  WsEnvelope,
} from '@vben/types';

import type { WsConnectionStatus } from '#/store';

import { computed, effectScope, ref, watch } from 'vue';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';
import { WS_CHANNELS } from '@vben/types';

import { useWebSocket } from '@vueuse/core';
import { message, notification } from 'antdv-next';

import { $t } from '#/locales';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useWsStore } from '#/store';

import { authorizedGlobalChannels } from './ws/ws-channel-permissions';
import { dispatchWsEnvelope } from './ws/ws-dispatch';
import { buildWsUrl } from './ws/ws-url';

/** Application heartbeat cadence (mirrors the server's 15s ping). */
const HEARTBEAT_INTERVAL_MS = 15_000;
/** Close the socket when no frame arrives within this window after a ping. */
const HEARTBEAT_PONG_TIMEOUT_MS = 30_000;
/** Initial reconnect delay (first retry within the ≤5s acceptance budget). */
const RECONNECT_DELAY_MS = 1000;
/** Exponential backoff ceiling for sustained outages. */
const RECONNECT_DELAY_MAX_MS = 30_000;

/** Backoff: 1s → 2s → 4s … capped at 30s. */
function reconnectBackoffMs(retried: number): number {
  const exponent = Math.max(0, retried);
  return Math.min(RECONNECT_DELAY_MS * 2 ** exponent, RECONNECT_DELAY_MAX_MS);
}
/** Bell notification list capacity. */
const NOTIFICATION_CAP = 50;

export interface QpWsApi {
  /** Tri-state connection status (drives the header badge). */
  status: ComputedRef<WsConnectionStatus>;
  /** Bell notification feed (system alerts). */
  notifications: Ref<NotificationItem[]>;
  /** Open the socket (idempotent); requires an access token. */
  connect: () => void;
  /** Close the socket and stop reconnecting (logout / teardown). */
  disconnect: () => void;
  /** Subscribe this caller to a market's book updates (refcounted). */
  subscribeMarket: (marketId: MarketId) => void;
  /** Release one subscription refcount; unsubscribes at zero. */
  unsubscribeMarket: (marketId: MarketId) => void;
}

/** antd notification severity per alert level. */
const ALERT_NOTIFY: Record<AlertLevel, 'error' | 'info' | 'warning'> = {
  critical: 'error',
  emergency: 'error',
  info: 'info',
  warning: 'warning',
};

let instance: null | QpWsApi = null;

function createQpWs(): QpWsApi {
  // Detached scope: the singleton must survive any component that first
  // touched it (useWebSocket auto-closes on scope dispose otherwise).
  const scope = effectScope(true);

  const api = scope.run(() => {
    const accessStore = useAccessStore();
    const wsStore = useWsStore();
    const { hasAccessByCodes } = useQpAccess();
    const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

    /** Whether the app currently wants a live connection. */
    const desired = ref(false);
    /** Per-market book subscription refcounts (replayed after reconnect). */
    const marketRefCounts = new Map<MarketId, number>();

    const notifications = ref<NotificationItem[]>([]);
    const alertToastLastSeen = new Map<string, number>();
    let notificationSeq = 0;

    const url = computed(() => {
      const token = accessStore.accessToken;
      // An undefined URL keeps useWebSocket from connecting (fail-closed);
      // reconnects re-read this computed, so a refreshed token is picked up.
      return token ? buildWsUrl(apiURL, token) : undefined;
    });

    function pushNotification(title: string, msg: string, key?: string) {
      const id = key ? `qp-alert-${key}` : `qp-ws-${notificationSeq + 1}`;
      const existing = notifications.value.find((item) => item.id === id);
      if (existing) {
        existing.date = new Date().toLocaleString();
        existing.isRead = false;
        existing.message = msg;
        existing.title = title;
        return;
      }
      notificationSeq += 1;
      notifications.value.unshift({
        avatar: preferences.app.defaultAvatar,
        date: new Date().toLocaleString(),
        id,
        isRead: false,
        message: msg,
        title,
      });
      if (notifications.value.length > NOTIFICATION_CAP) {
        notifications.value.length = NOTIFICATION_CAP;
      }
    }

    function shouldToastAlert(key: string, dedupeSecs: number): boolean {
      const now = Date.now();
      const lastSeen = alertToastLastSeen.get(key);
      const dedupeMs = Math.max(dedupeSecs, 1) * 1000;
      if (lastSeen !== undefined && now - lastSeen < dedupeMs) {
        return false;
      }
      alertToastLastSeen.set(key, now);
      return true;
    }

    const socket = useWebSocket(url, {
      autoReconnect: {
        delay: reconnectBackoffMs,
        retries: Number.POSITIVE_INFINITY,
      },
      heartbeat: {
        interval: HEARTBEAT_INTERVAL_MS,
        message: JSON.stringify({ action: 'ping' } satisfies WsClientCommand),
        pongTimeout: HEARTBEAT_PONG_TIMEOUT_MS,
      },
      immediate: false,
      onConnected() {
        // Re-establish the full session contract on every (re)connect:
        // authorized global channels → full sync → per-market replays.
        for (const channel of authorizedGlobalChannels(hasAccessByCodes)) {
          sendCommand({ action: 'subscribe', channel });
        }
        sendCommand({ action: 'sync' });
        for (const [marketId, count] of marketRefCounts) {
          if (count > 0) {
            sendCommand({
              action: 'subscribe',
              channel: WS_CHANNELS.marketBookUpdate,
              market_id: marketId,
            });
          }
        }
      },
      onMessage(_ws, event) {
        let envelope: WsEnvelope;
        try {
          envelope = JSON.parse(event.data as string) as WsEnvelope;
        } catch {
          console.warn('[qp-ws] non-JSON frame dropped:', event.data);
          return;
        }
        dispatchWsEnvelope(envelope, {
          onAlert(alert) {
            wsStore.recordAlert(alert);
            if (
              alert.visible_toast &&
              shouldToastAlert(alert.idempotency_key, alert.dedupe_secs)
            ) {
              notification[ALERT_NOTIFY[alert.level]]({
                description: alert.message,
                title: alert.title,
              });
            }
            pushNotification(
              alert.title || $t(`page.ws.alertLevel.${alert.level}`),
              alert.message,
              alert.idempotency_key,
            );
          },
          onConfigActivated(event) {
            message.info(
              $t('page.ws.configActivated', { version: event.version_id }),
            );
          },
          onMarketResolved() {
            // Silent: `dispatchWsEnvelope` marks the market resolved in the store.
          },
        });
      },
    });

    function sendCommand(command: WsClientCommand) {
      socket.send(JSON.stringify(command));
    }

    const status = computed<WsConnectionStatus>(() => {
      switch (socket.status.value) {
        case 'CONNECTING': {
          return 'reconnecting';
        }
        case 'OPEN': {
          return 'connected';
        }
        default: {
          // A closed socket the app still wants is mid-reconnect.
          return desired.value ? 'reconnecting' : 'disconnected';
        }
      }
    });

    watch(status, (next) => wsStore.setStatus(next), { immediate: true });

    function connect() {
      if (!accessStore.accessToken) {
        return;
      }
      desired.value = true;
      socket.open();
    }

    function disconnect() {
      desired.value = false;
      marketRefCounts.clear();
      notifications.value = [];
      alertToastLastSeen.clear();
      notificationSeq = 0;
      wsStore.clearRecentAlert();
      socket.close();
    }

    function subscribeMarket(marketId: MarketId) {
      const count = marketRefCounts.get(marketId) ?? 0;
      marketRefCounts.set(marketId, count + 1);
      if (count === 0 && socket.status.value === 'OPEN') {
        sendCommand({
          action: 'subscribe',
          channel: WS_CHANNELS.marketBookUpdate,
          market_id: marketId,
        });
      }
    }

    function unsubscribeMarket(marketId: MarketId) {
      const count = marketRefCounts.get(marketId) ?? 0;
      if (count <= 1) {
        marketRefCounts.delete(marketId);
        if (count === 1 && socket.status.value === 'OPEN') {
          sendCommand({
            action: 'unsubscribe',
            channel: WS_CHANNELS.marketBookUpdate,
            market_id: marketId,
          });
        }
      } else {
        marketRefCounts.set(marketId, count - 1);
      }
    }

    return {
      connect,
      disconnect,
      notifications,
      status,
      subscribeMarket,
      unsubscribeMarket,
    };
  });
  if (api === undefined) {
    throw new Error('quant-pivot WebSocket scope failed to initialize');
  }
  return api;
}

/**
 * Singleton quant-pivot WebSocket session (one connection shared app-wide).
 * Lifecycle: `connect()` in the basic layout once access is checked,
 * `disconnect()` on logout.
 */
export function useQpWs(): QpWsApi {
  instance ??= createQpWs();
  return instance;
}
