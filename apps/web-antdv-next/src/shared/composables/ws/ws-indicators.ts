import type { SystemStatus } from '@vben/types';

/** Aggregated header status light derived from authoritative `operational_phase`. */
export type SystemIndicator =
  | 'critical'
  | 'degraded'
  | 'running'
  | 'starting'
  | 'unknown';

/**
 * Aggregate the header status light from `system.status.operational_phase`.
 * Clients must not re-derive lifecycle from catalog, breaker, or alert latches.
 */
export function deriveSystemIndicator(
  system: null | SystemStatus,
): SystemIndicator {
  if (!system) {
    return 'unknown';
  }
  switch (system.operational_phase.phase) {
    case 'catalog_warming':
    case 'market_data_connecting': {
      return 'starting';
    }
    case 'degraded': {
      return 'degraded';
    }
    case 'halted': {
      return 'critical';
    }
    case 'operational': {
      return 'running';
    }
    default: {
      return 'unknown';
    }
  }
}

/** Connected WS shard count for the starting sub-label. */
export function marketDataShardConnected(
  marketData: SystemStatus['market_data'],
): number {
  const { total, disconnected } = marketData.ws_shards;
  return Math.max(0, total - disconnected);
}
