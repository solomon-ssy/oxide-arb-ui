import type { WsChannel } from '@vben/types';

import { WS_CHANNELS } from '@vben/types';

/**
 * Read-permission code required to subscribe to each WS channel, mirroring the
 * backend session loop's per-channel Casbin `Read` check. Subscribing without
 * the matching code is answered with a `forbidden` error frame, so the client
 * filters its subscriptions up front.
 */
export const WS_CHANNEL_PERMISSIONS: Record<WsChannel, string> = {
  [WS_CHANNELS.configActivated]: 'runtime_config:read',
  [WS_CHANNELS.controlPublished]: 'control_factor:read',
  [WS_CHANNELS.marketBookUpdate]: 'market:read',
  [WS_CHANNELS.marketResolved]: 'market:read',
  [WS_CHANNELS.materializationRunUpdate]: 'control_factor:read',
  [WS_CHANNELS.opportunityDetected]: 'opportunity:read',
  [WS_CHANNELS.pnlUpdate]: 'pnl:read',
  [WS_CHANNELS.riskCircuitBreaker]: 'risk:read',
  [WS_CHANNELS.riskPositionUpdate]: 'risk:read',
  [WS_CHANNELS.systemAlert]: 'system:read',
  [WS_CHANNELS.systemStatus]: 'system:read',
  [WS_CHANNELS.tradeFilled]: 'trade:read',
  [WS_CHANNELS.tradeSettled]: 'trade:read',
};

/**
 * Global channels the client batch-subscribes after (re)connect, filtered by
 * the session's permission codes. `market.book_update` is deliberately absent:
 * it is market-scoped and driven by per-market `subscribeMarket` refcounts.
 */
export const GLOBAL_WS_CHANNELS: WsChannel[] = Object.values(
  WS_CHANNELS,
).filter((channel) => channel !== WS_CHANNELS.marketBookUpdate);

/** Channels the session may subscribe to, given its permission codes. */
export function authorizedGlobalChannels(
  hasAccessByCodes: (codes: string[]) => boolean,
): WsChannel[] {
  return GLOBAL_WS_CHANNELS.filter((channel) =>
    hasAccessByCodes([WS_CHANNEL_PERMISSIONS[channel]]),
  );
}
