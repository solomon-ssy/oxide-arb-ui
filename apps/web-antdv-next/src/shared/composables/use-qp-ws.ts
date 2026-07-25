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

import { message, notification } from 'antdv-next';

import { issueWsTicketApi } from '#/api';
import { $t } from '#/locales';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useSystemStore, useWsStore } from '#/store';

import { authorizedGlobalChannels } from './ws/ws-channel-permissions';
import { dispatchWsEnvelope } from './ws/ws-dispatch';
import { buildWsTicketProtocol, buildWsUrl } from './ws/ws-url';

const HEARTBEAT_INTERVAL_MS = 15_000;
const HEARTBEAT_PONG_TIMEOUT_MS = 30_000;
const RECONNECT_DELAY_MS = 1000;
const RECONNECT_DELAY_MAX_MS = 30_000;
const NOTIFICATION_CAP = 50;

function reconnectBackoffMs(retried: number): number {
  const exponent = Math.max(0, retried);
  return Math.min(RECONNECT_DELAY_MS * 2 ** exponent, RECONNECT_DELAY_MAX_MS);
}

function withJitter(delayMs: number): number {
  return Math.round(delayMs * (0.8 + Math.random() * 0.4));
}

export interface QpWsApi {
  status: ComputedRef<WsConnectionStatus>;
  notifications: Ref<NotificationItem[]>;
  connect: () => void;
  disconnect: () => void;
  subscribeMarket: (marketId: MarketId) => void;
  unsubscribeMarket: (marketId: MarketId) => void;
}

const ALERT_NOTIFY: Record<AlertLevel, 'error' | 'info' | 'warning'> = {
  critical: 'error',
  emergency: 'error',
  info: 'info',
  warning: 'warning',
};

let instance: null | QpWsApi = null;

function createQpWs(): QpWsApi {
  const scope = effectScope(true);

  const api = scope.run(() => {
    const accessStore = useAccessStore();
    const systemStore = useSystemStore();
    const wsStore = useWsStore();
    const { hasAccessByCodes } = useQpAccess();
    const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

    const desired = ref(false);
    const socketState = ref<'CLOSED' | 'CONNECTING' | 'OPEN'>('CLOSED');
    const marketRefCounts = new Map<MarketId, number>();
    const notifications = ref<NotificationItem[]>([]);
    const alertToastLastSeen = new Map<string, number>();

    let socket: null | WebSocket = null;
    let reconnectTimer: null | ReturnType<typeof setTimeout> = null;
    let heartbeatTimer: null | ReturnType<typeof setInterval> = null;
    let pongTimeout: null | ReturnType<typeof setTimeout> = null;
    let generation = 0;
    let reconnectAttempts = 0;
    let notificationSeq = 0;
    let networkListenersRegistered = false;

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

    function clearHeartbeat() {
      if (heartbeatTimer !== null) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (pongTimeout !== null) {
        clearTimeout(pongTimeout);
        pongTimeout = null;
      }
    }

    function clearReconnectTimer() {
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    }

    function recordInboundFrame() {
      if (pongTimeout !== null) {
        clearTimeout(pongTimeout);
        pongTimeout = null;
      }
    }

    function sendCommand(command: WsClientCommand) {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(command));
      }
    }

    function replaySubscriptions() {
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
    }

    function handleEnvelope(event: MessageEvent) {
      recordInboundFrame();
      if (typeof event.data !== 'string') {
        console.warn('[qp-ws] non-text frame dropped');
        return;
      }

      let envelope: WsEnvelope;
      try {
        envelope = JSON.parse(event.data) as WsEnvelope;
      } catch {
        console.warn('[qp-ws] non-JSON frame dropped');
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
        onMarketResolved() {},
      });
    }

    function startHeartbeat(ws: WebSocket) {
      clearHeartbeat();
      heartbeatTimer = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          return;
        }
        ws.send(JSON.stringify({ action: 'ping' } satisfies WsClientCommand));
        pongTimeout ??= setTimeout(() => {
          pongTimeout = null;
          ws.close(4000, 'heartbeat timeout');
        }, HEARTBEAT_PONG_TIMEOUT_MS);
      }, HEARTBEAT_INTERVAL_MS);
    }

    function scheduleReconnect() {
      if (!desired.value || !navigator.onLine || reconnectTimer !== null) {
        return;
      }
      const delay = withJitter(reconnectBackoffMs(reconnectAttempts));
      reconnectAttempts += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void openSocket();
      }, delay);
    }

    async function openSocket() {
      if (
        !desired.value ||
        !accessStore.accessToken ||
        !navigator.onLine ||
        socketState.value !== 'CLOSED'
      ) {
        return;
      }

      const attemptGeneration = ++generation;
      socketState.value = 'CONNECTING';
      try {
        const { ticket } = await issueWsTicketApi();
        if (!desired.value || attemptGeneration !== generation) {
          return;
        }

        const ws = new WebSocket(buildWsUrl(apiURL), [
          buildWsTicketProtocol(ticket),
        ]);
        socket = ws;

        ws.addEventListener('open', () => {
          if (!desired.value || socket !== ws) {
            ws.close(1000, 'connection no longer desired');
            return;
          }
          socketState.value = 'OPEN';
          reconnectAttempts = 0;
          startHeartbeat(ws);
          replaySubscriptions();
        });
        ws.addEventListener('message', handleEnvelope);
        ws.addEventListener('error', () => ws.close());
        ws.addEventListener('close', () => {
          if (socket !== ws) {
            return;
          }
          socket = null;
          socketState.value = 'CLOSED';
          clearHeartbeat();
          scheduleReconnect();
        });
      } catch {
        if (attemptGeneration !== generation) {
          return;
        }
        socketState.value = 'CLOSED';
        scheduleReconnect();
      }
    }

    function suspendWhileOffline() {
      if (!desired.value) {
        return;
      }
      generation += 1;
      reconnectAttempts = 0;
      clearReconnectTimer();
      clearHeartbeat();

      const activeSocket = socket;
      socket = null;
      socketState.value = 'CLOSED';
      activeSocket?.close(4001, 'browser offline');
    }

    function reconnectWhenOnline() {
      if (!desired.value || !navigator.onLine) {
        return;
      }
      reconnectAttempts = 0;
      clearReconnectTimer();
      void openSocket();
    }

    function registerNetworkListeners() {
      if (networkListenersRegistered) {
        return;
      }
      window.addEventListener('offline', suspendWhileOffline);
      window.addEventListener('online', reconnectWhenOnline);
      networkListenersRegistered = true;
    }

    function unregisterNetworkListeners() {
      if (!networkListenersRegistered) {
        return;
      }
      window.removeEventListener('offline', suspendWhileOffline);
      window.removeEventListener('online', reconnectWhenOnline);
      networkListenersRegistered = false;
    }

    const status = computed<WsConnectionStatus>(() => {
      if (socketState.value === 'OPEN') {
        return 'connected';
      }
      return desired.value ? 'reconnecting' : 'disconnected';
    });

    watch(
      status,
      (next) => {
        wsStore.setStatus(next);
        if (next !== 'connected') {
          systemStore.clearActionEligibility();
        }
      },
      { immediate: true },
    );
    watch(
      () => accessStore.accessToken,
      (token) => {
        if (!token && desired.value) {
          disconnect();
        }
      },
    );

    function connect() {
      if (!accessStore.accessToken) {
        return;
      }
      desired.value = true;
      registerNetworkListeners();
      void openSocket();
    }

    function disconnect() {
      desired.value = false;
      generation += 1;
      reconnectAttempts = 0;
      clearReconnectTimer();
      clearHeartbeat();
      unregisterNetworkListeners();
      marketRefCounts.clear();
      notifications.value = [];
      alertToastLastSeen.clear();
      notificationSeq = 0;
      wsStore.clearRecentAlert();

      const activeSocket = socket;
      socket = null;
      socketState.value = 'CLOSED';
      activeSocket?.close(1000, 'client disconnect');
    }

    function subscribeMarket(marketId: MarketId) {
      const count = marketRefCounts.get(marketId) ?? 0;
      marketRefCounts.set(marketId, count + 1);
      if (count === 0 && socketState.value === 'OPEN') {
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
        if (count === 1 && socketState.value === 'OPEN') {
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

/** One application-wide WebSocket session, explicitly closed during logout. */
export function useQpWs(): QpWsApi {
  instance ??= createQpWs();
  return instance;
}
