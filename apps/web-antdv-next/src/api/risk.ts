import type { RiskEngineStateView } from '@vben/types';

import { withSilentError } from '@vben/request/oxide';

import { requestClient } from '#/api/request';

export namespace RiskApi {
  export const base = '/risk';
  export const circuitBreaker = `${base}/circuit-breaker`;
}

/** `GET /risk/circuit-breaker` — full live risk-engine state snapshot. */
export async function getCircuitBreaker() {
  return requestClient.get<RiskEngineStateView>(
    RiskApi.circuitBreaker,
    withSilentError(),
  );
}
