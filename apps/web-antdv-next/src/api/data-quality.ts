import type { DataQualitySnapshot } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace DataQualityApi {
  export const snapshot = '/quant/data-quality';
}

/** `GET /quant/data-quality` — live data-quality aggregate snapshot. */
export async function getDataQualitySnapshot() {
  return requestClient.get<DataQualitySnapshot>(DataQualityApi.snapshot);
}
