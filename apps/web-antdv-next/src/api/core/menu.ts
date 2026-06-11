import type { MenuTreeNode } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace MenuApi {
  export const base = '/menus';
  export const accessible = `${base}/accessible`;
}

export async function getAccessibleMenusApi() {
  return requestClient.get<MenuTreeNode[]>(MenuApi.accessible);
}
