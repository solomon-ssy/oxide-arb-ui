import { requestClient } from '#/api/request';

export namespace RuntimeConfigApi {
  export const base = '/runtime-config';
}

/** Minimal slice of the live runtime config used by dashboard KPIs. */
export interface RuntimeConfigRiskLimits {
  max_daily_loss_usd?: string;
}

export interface RuntimeConfigCurrentView {
  config: {
    risk?: RuntimeConfigRiskLimits;
  };
}

/** `GET /runtime-config` — live applied config (credentials masked). */
export async function getCurrentRuntimeConfig() {
  return requestClient.get<RuntimeConfigCurrentView>(RuntimeConfigApi.base);
}
