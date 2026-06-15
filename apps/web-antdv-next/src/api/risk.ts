import type {
  BlacklistEntryView,
  BlacklistReason,
  MarketId,
  PositionView,
  RiskEngineStateView,
  UsdString,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { withSilentError } from '@vben/request/oxide';

import { governedPost } from '#/api/governed-request';
import { requestClient } from '#/api/request';

export namespace RiskApi {
  export const base = '/risk';
  export const circuitBreaker = `${base}/circuit-breaker`;
  export const circuitBreakerReset = `${circuitBreaker}/reset`;
  export const dailyLoss = `${base}/daily-loss`;
  export const exposure = `${base}/exposure`;
  export const positions = `${base}/positions`;
  export const blacklist = `${base}/blacklist`;
  export const blacklistRemove = (marketId: MarketId) =>
    `${blacklist}/${marketId}/remove`;

  export type AddBlacklistBody = Record<string, unknown> & {
    blacklist_reason: BlacklistReason;
    market_id: MarketId;
    reason: string;
  };

  export type GovernedReasonBody = Record<string, unknown> & {
    reason: string;
  };
}

/** `GET /risk/circuit-breaker` — full live risk-engine state snapshot. */
export async function getCircuitBreaker() {
  return requestClient.get<RiskEngineStateView>(
    RiskApi.circuitBreaker,
    withSilentError(),
  );
}

/** `GET /risk/positions` — currently open positions. */
export async function getPositions() {
  return requestClient.get<PositionView[]>(
    RiskApi.positions,
    withSilentError(),
  );
}

/** `GET /risk/exposure` — live total exposure. */
export async function getExposure() {
  return requestClient.get<UsdString>(RiskApi.exposure, withSilentError());
}

/** `GET /risk/daily-loss` — live daily loss magnitude. */
export async function getDailyLoss() {
  return requestClient.get<UsdString>(RiskApi.dailyLoss, withSilentError());
}

/** `POST /risk/circuit-breaker/reset` — governed breaker reset. */
export async function resetCircuitBreaker(
  body: RiskApi.GovernedReasonBody,
  ctx: GovernedContext,
) {
  return governedPost<null>(RiskApi.circuitBreakerReset, body, ctx);
}

/** `GET /risk/blacklist` — active blacklist entries. */
export async function fetchBlacklist() {
  return requestClient.get<BlacklistEntryView[]>(
    RiskApi.blacklist,
    withSilentError(),
  );
}

/** `POST /risk/blacklist` — governed blacklist insertion. */
export async function addBlacklist(
  body: RiskApi.AddBlacklistBody,
  ctx: GovernedContext,
) {
  return governedPost<null>(RiskApi.blacklist, body, ctx);
}

/** `POST /risk/blacklist/{market_id}/remove` — governed blacklist removal. */
export async function removeBlacklist(
  marketId: MarketId,
  body: RiskApi.GovernedReasonBody,
  ctx: GovernedContext,
) {
  return governedPost<null>(RiskApi.blacklistRemove(marketId), body, ctx);
}
